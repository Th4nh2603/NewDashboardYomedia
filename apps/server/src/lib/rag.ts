import { readFile, readdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

type RagSingleton = {
  docs: Document[];
  vectors: number[][];
  readyAt: number;
  sourceCount: number;
};

let singletonPromise: Promise<RagSingleton> | null = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      ext === ".json" ? JSON.stringify(JSON.parse(raw), null, 2) : raw;
    docs.push(
      new Document({
        pageContent: content,
        metadata: { source: name },
      }),
    );
  }
  return docs;
}

async function loadJsonDoc(jsonAbsPath: string, sourceName: string): Promise<Document[]> {
  const raw = await readFile(jsonAbsPath, "utf8");
  const content = JSON.stringify(JSON.parse(raw), null, 2);
  return [
    new Document({
      pageContent: content,
      metadata: { source: sourceName },
    }),
  ];
}

async function getRagSingleton(): Promise<RagSingleton> {
  if (singletonPromise) return singletonPromise;

  singletonPromise = (async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const docsFolder = path.join(process.cwd(), "rag", "docs");
    const creativeDemosPath = path.join(__dirname, "..", "data", "creative-demos.json");

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
      apiKey,
      texts: chunks.map((d) => d.pageContent),
    });

    return {
      docs: chunks,
      vectors,
      readyAt: Date.now(),
      sourceCount: docs.length,
    };
  })();

  return singletonPromise;
}

async function embedText(params: { apiKey: string; text: string; timeoutMs?: number }) {
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

    const json = (await res.json()) as any;
    if (!res.ok) {
      throw new Error(
        `Embedding failed (${res.status}): ${json?.error?.message || "Unknown error"}`,
      );
    }

    const values = json?.embedding?.values;
    if (!Array.isArray(values)) {
      throw new Error("Embedding response missing embedding.values");
    }
    return values as number[];
  } finally {
    clearTimeout(t);
  }
}

async function embedTexts(params: { apiKey: string; texts: string[] }) {
  // sequential to keep stable (quota/latency)
  const out: number[][] = [];
  for (const text of params.texts) {
    out.push(await embedText({ apiKey: params.apiKey, text, timeoutMs: 20000 }));
  }
  return out;
}

async function generateAnswer(params: {
  apiKey: string;
  prompt: string;
  timeoutMs?: number;
  model?: string;
}) {
  const timeoutMs = params.timeoutMs ?? 20000;
  const model = params.model ?? "gemini-flash-latest";
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
          contents: [{ role: "user", parts: [{ text: params.prompt }] }],
          generationConfig: { temperature: 0.2 },
        }),
        signal: ac.signal,
      },
    );

    const json = (await res.json()) as any;
    if (!res.ok) {
      throw new Error(
        `Generate failed (${res.status}): ${json?.error?.message || "Unknown error"}`,
      );
    }

    const text =
      json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";
    return String(text).trim();
  } finally {
    clearTimeout(t);
  }
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

export async function answerWithRag(params: { question: string }) {
  const question = params.question.trim();
  if (!question) throw new Error("Missing question");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const rag = await getRagSingleton();

  const qVec = await embedText({ apiKey, text: question, timeoutMs: 15000 });
  const scored = rag.vectors.map((v, idx) => ({
    idx,
    score: cosineSimilarity(qVec, v),
  }));
  scored.sort((a, b) => b.score - a.score);
  const retrieved = scored.slice(0, 6).map((s) => rag.docs[s.idx]!);

  const context = retrieved
    .map((d: Document, i: number) => {
      const src =
        typeof d.metadata?.source === "string" ? d.metadata.source : "unknown";
      return `[#${i + 1} source=${src}]\n${d.pageContent}`;
    })
    .join("\n\n---\n\n");

  const prompt = [
    "Bạn là YomediaAI. Trả lời NGẮN GỌN, đúng trọng tâm, dựa trên CONTEXT.",
    "Nếu CONTEXT không đủ thông tin, hãy nói rõ là không tìm thấy trong tài liệu và gợi ý người dùng bổ sung tài liệu.",
    "",
    "CONTEXT:",
    context,
    "",
    "QUESTION:",
    question,
  ].join("\n");

  let answer: string;
  try {
    answer = await generateAnswer({ apiKey, prompt, timeoutMs: 20000 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // If quota/rate limited, still respond with best-effort excerpt so UI doesn't "hang".
    if (msg.includes("(429)") || msg.toLowerCase().includes("quota")) {
      const maxChars = 3500;
      let used = 0;
      const excerpts: string[] = [];
      const sources = new Set<string>();

      for (const d of retrieved) {
        const src =
          typeof d.metadata?.source === "string" ? d.metadata.source : "unknown";
        sources.add(src);

        const remaining = maxChars - used;
        if (remaining <= 0) break;

        const chunk = d.pageContent.trim();
        if (!chunk) continue;

        const take = chunk.length > remaining ? chunk.slice(0, remaining) : chunk;
        excerpts.push(take);
        used += take.length + 10;
      }

      const sourcesLine = Array.from(sources).join(", ") || "unknown";
      answer =
        "Gemini đang bị giới hạn quota/rate-limit, nên mình trả lời tạm bằng trích đoạn tài liệu liên quan nhất.\n" +
        `Nguồn: ${sourcesLine}\n\n` +
        (excerpts.length ? excerpts.join("\n\n---\n\n") : "Không có đoạn trích phù hợp trong tài liệu.");
    } else {
      throw err;
    }
  }

  return {
    answer,
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
