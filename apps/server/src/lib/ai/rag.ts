import { readFile, readdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import OpenAI from "openai";

import { getChatSystemPrompt } from "./chatSystemPrompt.js";
import {
  formatTavilyHitsForPrompt,
  parseWebSearchQuestion,
  searchWebWithTavily,
} from "./tavily.js";

export type ChatAiProvider = "gemini" | "openai";
export type ChatAttachmentMeta = {
  name: string;
  relativePath?: string;
  size: number;
  mimeType?: string;
};

type UploadDemoActionPlan = {
  intent: "upload_demo";
  tool: "build_demo_convert_upload";
  uploadKind: "html" | "video";
  confidence: number;
  remotePath: string | null;
  brand: string | null;
  demoId: string | null;
  demoValue: string | null;
  overwrite: boolean;
  attachmentsSummary: {
    fileCount: number;
    totalBytes: number;
    textCount: number;
    binaryCount: number;
  };
  requiredInputs: string[];
};

type RagSingleton = {
  docs: Document[];
  vectors: number[][];
  readyAt: number;
  sourceCount: number;
};

const singletonByProvider = new Map<ChatAiProvider, Promise<RagSingleton>>();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function stripUtf8Bom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseJsonText(raw: string): unknown {
  return JSON.parse(stripUtf8Bom(raw));
}

function requireApiKey(provider: ChatAiProvider): string {
  if (provider === "openai") {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) throw new Error("Missing OPENAI_API_KEY");
    return key;
  }
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  return key;
}

function providerDisplayName(provider: ChatAiProvider): string {
  return provider === "openai" ? "OpenAI" : "Gemini";
}

function detectUploadDemoIntent(question: string): boolean {
  return /\b(upload\s*demo|demo\s*upload|upload\s*video\s*demo|video\s*demo\s*upload|convert\s+and\s+upload)\b/i.test(
    question,
  );
}

function detectUploadDemoKindFromAttachments(
  attachments: ChatAttachmentMeta[],
): "html" | "video" {
  if (attachments.length === 0) return "html";
  const videoCount = attachments.filter((a) => {
    const ext = (a.name.split(".").pop() ?? "").toLowerCase();
    return ["mp4", "webm", "mov"].includes(ext);
  }).length;
  const textCount = attachments.filter((a) => {
    const ext = (a.name.split(".").pop() ?? "").toLowerCase();
    return ["html", "htm", "js"].includes(ext);
  }).length;
  if (videoCount > 0 && textCount === 0) return "video";
  return "html";
}

function extractRemotePath(question: string): string | null {
  const m = question.match(
    /(?:path|to|target)\s*[:=]\s*(\/?script\/demo\/[^\s,;]+|[0-9]{4}\/[^\s,;]+)/i,
  );
  if (!m?.[1]) return null;
  return m[1]
    .trim()
    .replace(/^\/+/, "")
    .replace(/^script\/demo\//i, "")
    .replace(/\/+$/, "");
}

function extractBrandFromRemotePath(remotePath: string | null): string | null {
  if (!remotePath) return null;
  const parts = remotePath
    .replace(/^\/+/, "")
    .replace(/^script\/demo\//i, "")
    .split("/")
    .filter(Boolean);
  // Expected shape: year/month/brand/...
  if (parts.length < 3) return null;
  const candidate = (parts[2] ?? "").trim();
  return candidate || null;
}

function extractBrand(question: string): string | null {
  const explicit = question.match(
    /\bbrand\s*[:=]\s*([a-z0-9][a-z0-9 _-]{1,60})\b/i,
  );
  if (explicit?.[1]) return explicit[1].trim();

  const plain = question.match(/\bbrand\s+([a-z0-9][a-z0-9 _-]{1,60})\b/i);
  if (plain?.[1]) return plain[1].trim();

  const forBrand = question.match(
    /\b(?:for|cho)\s+brand\s+([a-z0-9][a-z0-9 _-]{1,60})\b/i,
  );
  if (forBrand?.[1]) return forBrand[1].trim();
  return null;
}

function extractDemoId(question: string): string | null {
  const m = question.match(
    /\b(?:demoId|demo_id|creativeId|creative_id)\s*[:=]\s*([a-z0-9_-]{2,40})\b/i,
  );
  if (!m?.[1]) return null;
  return m[1].trim();
}

function extractDemoValue(question: string): string | null {
  const explicit = question.match(
    /\b(?:demoValue|demo_value|value|format)\s*[:=]\s*([a-z0-9][a-z0-9 _-]{2,80})\b/i,
  );
  if (explicit?.[1]) return explicit[1].trim();

  const plain = question.match(
    /\b(?:demoValue|demo_value|value|format)\s+([a-z0-9][a-z0-9 _-]{2,80})\b/i,
  );
  if (!plain?.[1]) return null;
  return plain[1].trim();
}

function buildUploadDemoPlan(
  question: string,
  attachments: ChatAttachmentMeta[],
): UploadDemoActionPlan {
  const textCount = attachments.filter((a) => {
    const ext = (a.name.split(".").pop() ?? "").toLowerCase();
    return ["html", "htm", "js"].includes(ext);
  }).length;
  const videoCount = attachments.filter((a) => {
    const ext = (a.name.split(".").pop() ?? "").toLowerCase();
    return ["mp4", "webm", "mov"].includes(ext);
  }).length;
  const binaryCount = videoCount;
  const totalBytes = attachments.reduce((sum, a) => sum + a.size, 0);
  const overwrite = false;
  const remotePath = extractRemotePath(question);
  const explicitBrand = extractBrand(question);
  const inferredBrand = extractBrandFromRemotePath(remotePath);
  const brand = explicitBrand || inferredBrand;
  const demoId = extractDemoId(question);
  const demoValue = extractDemoValue(question);
  const uploadKind = detectUploadDemoKindFromAttachments(attachments);
  const requiredInputs: string[] = [];
  if (!brand) requiredInputs.push("brand");
  if (uploadKind !== "video" && !demoId && !demoValue) {
    requiredInputs.push("format");
  }
  if (attachments.length === 0) requiredInputs.push("attachments");
  if (uploadKind === "video" && videoCount !== 1) {
    requiredInputs.push("single_video");
  }
  return {
    intent: "upload_demo",
    tool: "build_demo_convert_upload",
    uploadKind,
    confidence: attachments.length > 0 ? 0.95 : 0.6,
    remotePath,
    brand,
    demoId,
    demoValue,
    overwrite,
    attachmentsSummary: {
      fileCount: attachments.length,
      totalBytes,
      textCount,
      binaryCount,
    },
    requiredInputs,
  };
}

async function loadDocsFromFolder(folderAbs: string): Promise<Document[]> {
  const entries = await readdir(folderAbs, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => /\.(md|txt|json)$/i.test(name))
    .sort();

  const docs: Document[] = [];
  for (const name of files) {
    const fullPath = path.join(folderAbs, name);
    const raw = await readFile(fullPath, "utf8");
    const ext = path.extname(name).toLowerCase();
    const content =
      ext === ".json" ? JSON.stringify(parseJsonText(raw), null, 2) : raw;
    docs.push(
      new Document({
        pageContent: content,
        metadata: { source: name },
      }),
    );
  }
  return docs;
}

async function loadJsonDoc(
  jsonAbsPath: string,
  sourceName: string,
): Promise<Document[]> {
  const raw = await readFile(jsonAbsPath, "utf8");
  const content = JSON.stringify(parseJsonText(raw), null, 2);
  return [
    new Document({
      pageContent: content,
      metadata: { source: sourceName },
    }),
  ];
}

async function getRagSingleton(
  provider: ChatAiProvider,
): Promise<RagSingleton> {
  let promise = singletonByProvider.get(provider);
  if (!promise) {
    promise = buildRagSingleton(provider);
    singletonByProvider.set(provider, promise);
  }
  return promise;
}

async function buildRagSingleton(
  provider: ChatAiProvider,
): Promise<RagSingleton> {
  const apiKey = requireApiKey(provider);

  const docsFolder = path.join(process.cwd(), "rag", "docs");
  const creativeDemosPath = path.join(
    __dirname,
    "..",
    "..",
    "data",
    "creative-demos.json",
  );

  const [docsFromFolder, docsFromCreativeDemos] = await Promise.all([
    loadDocsFromFolder(docsFolder),
    loadJsonDoc(creativeDemosPath, "creative-demos.json"),
  ]);

  const docs = [...docsFromFolder, ...docsFromCreativeDemos];
  if (docs.length === 0) {
    throw new Error(`No RAG docs found in ${docsFolder}`);
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1200,
    chunkOverlap: 200,
  });
  const chunks = await splitter.splitDocuments(docs);

  const vectors = await embedTexts({
    provider,
    apiKey,
    texts: chunks.map((d) => d.pageContent),
  });

  return {
    docs: chunks,
    vectors,
    readyAt: Date.now(),
    sourceCount: docs.length,
  };
}

async function embedTextGemini(params: {
  apiKey: string;
  text: string;
  timeoutMs?: number;
}) {
  const timeoutMs = params.timeoutMs ?? 15000;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${encodeURIComponent(
        params.apiKey,
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text: params.text }] },
        }),
        signal: ac.signal,
      },
    );

    const json = (await res.json()) as {
      error?: { message?: string };
      embedding?: { values?: number[] };
    };
    if (!res.ok) {
      throw new Error(
        `Embedding failed (${res.status}): ${json?.error?.message || "Unknown error"}`,
      );
    }

    const values = json?.embedding?.values;
    if (!Array.isArray(values)) {
      throw new Error("Embedding response missing embedding.values");
    }
    return values;
  } finally {
    clearTimeout(t);
  }
}

async function embedTextOpenAI(params: {
  apiKey: string;
  text: string;
  timeoutMs?: number;
}) {
  const timeoutMs = params.timeoutMs ?? 15000;
  const client = new OpenAI({ apiKey: params.apiKey, timeout: timeoutMs });
  const model =
    process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
  const res = await client.embeddings.create({
    model,
    input: params.text,
  });
  const embedding = res.data[0]?.embedding;
  if (!embedding?.length) {
    throw new Error("OpenAI embedding response missing embedding vector");
  }
  return embedding;
}

async function embedText(params: {
  provider: ChatAiProvider;
  apiKey: string;
  text: string;
  timeoutMs?: number;
}) {
  if (params.provider === "openai") {
    return embedTextOpenAI(params);
  }
  return embedTextGemini(params);
}

async function embedTexts(params: {
  provider: ChatAiProvider;
  apiKey: string;
  texts: string[];
}) {
  const out: number[][] = [];
  for (const text of params.texts) {
    out.push(
      await embedText({
        provider: params.provider,
        apiKey: params.apiKey,
        text,
        timeoutMs: 20000,
      }),
    );
  }
  return out;
}

async function generateAnswerGemini(params: {
  apiKey: string;
  systemPrompt?: string;
  prompt: string;
  timeoutMs?: number;
  model?: string;
}) {
  const timeoutMs = params.timeoutMs ?? 20000;
  const model =
    params.model ??
    process.env.GEMINI_CHAT_MODEL?.trim() ??
    "gemini-flash-latest";
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(
        params.apiKey,
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(params.systemPrompt?.trim()
            ? {
                systemInstruction: {
                  parts: [{ text: params.systemPrompt.trim() }],
                },
              }
            : {}),
          contents: [{ role: "user", parts: [{ text: params.prompt }] }],
          generationConfig: { temperature: 0.2 },
        }),
        signal: ac.signal,
      },
    );

    const json = (await res.json()) as {
      error?: { message?: string };
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    if (!res.ok) {
      throw new Error(
        `Generate failed (${res.status}): ${json?.error?.message || "Unknown error"}`,
      );
    }

    const text =
      json?.candidates?.[0]?.content?.parts
        ?.map((p) => p?.text || "")
        .join("") || "";
    return String(text).trim();
  } finally {
    clearTimeout(t);
  }
}

async function generateAnswerOpenAI(params: {
  apiKey: string;
  systemPrompt?: string;
  prompt: string;
  timeoutMs?: number;
  model?: string;
}) {
  const timeoutMs = params.timeoutMs ?? 20000;
  const model =
    params.model ?? process.env.OPENAI_CHAT_MODEL?.trim() ?? "gpt-4o-mini";
  const client = new OpenAI({ apiKey: params.apiKey, timeout: timeoutMs });
  const system = params.systemPrompt?.trim();
  const res = await client.chat.completions.create({
    model,
    messages: [
      ...(system ? [{ role: "system" as const, content: system }] : []),
      { role: "user", content: params.prompt },
    ],
    temperature: 0.2,
  });
  return (res.choices[0]?.message?.content ?? "").trim();
}

async function generateAnswer(params: {
  provider: ChatAiProvider;
  apiKey: string;
  systemPrompt?: string;
  prompt: string;
  timeoutMs?: number;
}) {
  if (params.provider === "openai") {
    return generateAnswerOpenAI(params);
  }
  return generateAnswerGemini(params);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i]!;
    const bv = b[i]!;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

async function answerWithWebSearch(params: {
  query: string;
  provider: ChatAiProvider;
  apiKey: string;
}) {
  const hits = await searchWebWithTavily(params.query);
  const webContext = formatTavilyHitsForPrompt(hits);
  const systemPrompt = getChatSystemPrompt();

  const prompt = [
    "WEB CONTEXT (kết quả tìm kiếm internet):",
    webContext,
    "",
    "QUESTION:",
    params.query,
  ].join("\n");

  const answer = await generateAnswer({
    provider: params.provider,
    apiKey: params.apiKey,
    systemPrompt,
    prompt,
    timeoutMs: 25000,
  });

  return {
    answer,
    provider: params.provider,
    mode: "web" as const,
    sources: hits.map((h) => ({
      source: h.url,
      preview: `${h.title}: ${h.content.slice(0, 240)}`,
    })),
    rag: null,
  };
}

export async function answerWithRag(params: {
  question: string;
  provider?: ChatAiProvider;
  attachments?: ChatAttachmentMeta[];
}) {
  const question = params.question.trim();
  if (!question) throw new Error("Missing question");
  const attachments = params.attachments ?? [];

  const provider: ChatAiProvider =
    params.provider === "openai" ? "openai" : "gemini";
  const apiKey = requireApiKey(provider);

  if (detectUploadDemoIntent(question)) {
    const plan = buildUploadDemoPlan(question, attachments);
    const missing = plan.requiredInputs;
    const pipelineLabel =
      plan.uploadKind === "video"
        ? "video demo (1 MP4/WebM/MOV → tvc.mp4 + make-vast.xml)"
        : "HTML demo (convert base64 + upload)";
    const answer =
      missing.length > 0
        ? [
            "Upload demo intent detected.",
            `Pipeline: ${pipelineLabel}`,
            `Tool selected: ${plan.tool}`,
            `Attachments: ${plan.attachmentsSummary.fileCount} file(s), ${plan.attachmentsSummary.textCount} text, ${plan.attachmentsSummary.binaryCount} video.`,
            `Missing inputs: ${missing.join(", ")}`,
            plan.uploadKind === "video"
              ? "Video flow: attach exactly one video (previews: outstream + instream are generated automatically)."
              : "Please provide missing inputs so execution can continue.",
          ].join("\n")
        : [
            "Upload demo intent detected.",
            `Pipeline: ${pipelineLabel}`,
            `Tool selected: ${plan.tool}`,
            `Remote path: ${plan.remotePath || "(auto from brand)"}`,
            `Brand: ${plan.brand || "(not provided)"}`,
            `DemoId: ${plan.demoId || "(not provided)"}`,
            `DemoValue: ${plan.demoValue || "(not provided)"}`,
            `Attachments: ${plan.attachmentsSummary.fileCount} file(s).`,
            "Preflight passed. Ready to run convert + upload pipeline.",
          ].join("\n");
    return {
      answer,
      provider,
      mode: "upload_demo" as const,
      action: plan,
      sources: [],
      rag: null,
    };
  }

  const { isWebSearch, query: webQuery } = parseWebSearchQuestion(question);
  if (isWebSearch) {
    return answerWithWebSearch({ query: webQuery, provider, apiKey });
  }

  const rag = await getRagSingleton(provider);

  const qVec = await embedText({
    provider,
    apiKey,
    text: question,
    timeoutMs: 15000,
  });
  const scored = rag.vectors.map((v, idx) => ({
    idx,
    score: cosineSimilarity(qVec, v),
  }));
  scored.sort((a, b) => b.score - a.score);
  const sizeTokenMatch = question.match(/\b\d{2,4}x\d{2,4}\b/i);
  const sizeToken = sizeTokenMatch?.[0]?.toLowerCase() ?? null;
  const keywordMatchedIdx = sizeToken
    ? rag.docs
        .map((d, idx) => ({
          idx,
          has: d.pageContent.toLowerCase().includes(sizeToken),
        }))
        .filter((x) => x.has)
        .map((x) => x.idx)
    : [];

  const selectedIdx: number[] = [];
  for (const idx of keywordMatchedIdx) {
    if (!selectedIdx.includes(idx)) selectedIdx.push(idx);
    if (selectedIdx.length >= 6) break;
  }
  for (const s of scored) {
    if (!selectedIdx.includes(s.idx)) selectedIdx.push(s.idx);
    if (selectedIdx.length >= 6) break;
  }

  const retrieved = selectedIdx.map((idx) => rag.docs[idx]!);

  const context = retrieved
    .map((d: Document, i: number) => {
      const src =
        typeof d.metadata?.source === "string" ? d.metadata.source : "unknown";
      return `[#${i + 1} source=${src}]\n${d.pageContent}`;
    })
    .join("\n\n---\n\n");

  const systemPrompt = getChatSystemPrompt();
  const prompt = [
    "CONTEXT (tài liệu nội bộ):",
    context,
    "",
    "QUESTION:",
    question,
  ].join("\n");

  let answer: string;
  try {
    answer = await generateAnswer({
      provider,
      apiKey,
      systemPrompt,
      prompt,
      timeoutMs: 20000,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("(429)") || msg.toLowerCase().includes("quota")) {
      const maxChars = 3500;
      let used = 0;
      const excerpts: string[] = [];
      const sources = new Set<string>();

      for (const d of retrieved) {
        const src =
          typeof d.metadata?.source === "string"
            ? d.metadata.source
            : "unknown";
        sources.add(src);

        const remaining = maxChars - used;
        if (remaining <= 0) break;

        const chunk = d.pageContent.trim();
        if (!chunk) continue;

        const take =
          chunk.length > remaining ? chunk.slice(0, remaining) : chunk;
        excerpts.push(take);
        used += take.length + 10;
      }

      const sourcesLine = Array.from(sources).join(", ") || "unknown";
      const name = providerDisplayName(provider);
      answer =
        `${name} đang bị giới hạn quota/rate-limit, nên mình trả lời tạm bằng trích đoạn tài liệu liên quan nhất.\n` +
        `Nguồn: ${sourcesLine}\n\n` +
        (excerpts.length
          ? excerpts.join("\n\n---\n\n")
          : "Không có đoạn trích phù hợp trong tài liệu.");
    } else {
      throw err;
    }
  }

  return {
    answer,
    provider,
    mode: "rag" as const,
    sources: retrieved.map((d: Document) => ({
      source:
        typeof d.metadata?.source === "string" ? d.metadata.source : "unknown",
      preview: d.pageContent.slice(0, 240),
    })),
    rag: {
      readyAt: rag.readyAt,
      sourceCount: rag.sourceCount,
    },
  };
}
