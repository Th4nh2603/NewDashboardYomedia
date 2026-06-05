import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logBestEffort } from "../../logBestEffort.js";

type KnowledgeDoc = { file: string; content: string };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAG_DOCS_DIR = path.resolve(__dirname, "..", "..", "..", "..", "rag", "docs");
let docsCache: KnowledgeDoc[] | null = null;

function toSearchableText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function loadKnowledgeDocs(): Promise<KnowledgeDoc[]> {
  if (docsCache) return docsCache;
  try {
    const files = await fs.readdir(RAG_DOCS_DIR);
    const docFiles = files.filter((f) =>
      [".md", ".txt", ".json"].includes(path.extname(f).toLowerCase()),
    );
    const docs = await Promise.all(
      docFiles.map(async (file) => {
        const fullPath = path.join(RAG_DOCS_DIR, file);
        const content = await fs.readFile(fullPath, "utf8");
        return { file, content };
      }),
    );
    docsCache = docs;
    return docs;
  } catch (err) {
    logBestEffort("ai.knowledgeBase.load", err, { dir: RAG_DOCS_DIR });
    docsCache = [];
    return docsCache;
  }
}

const MAX_SNIPPET_CHARS = 2400;

function questionKeywords(question: string): string[] {
  return toSearchableText(question)
    .split(/[^a-z0-9]+/i)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);
}

function scoreText(question: string, text: string): number {
  const keywords = questionKeywords(question);
  if (!keywords.length) return 0;
  const normalized = toSearchableText(text);
  const lines = normalized.split(/\r?\n/);
  let score = 0;
  for (const keyword of keywords) {
    if (normalized.includes(keyword)) score += 2;
    if (lines.some((line) => line.includes(keyword))) score += 1;
  }
  return score;
}

function scoreDoc(question: string, doc: KnowledgeDoc): number {
  return scoreText(question, doc.content);
}

type MarkdownSection = { heading: string; body: string };

function splitMarkdownSections(content: string): MarkdownSection[] {
  const lines = content.split(/\r?\n/);
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection | null = null;

  for (const line of lines) {
    const match = /^(#{1,6})\s+/.exec(line);
    if (match) {
      if (current) sections.push(current);
      current = { heading: line.trim(), body: "" };
      continue;
    }
    if (!current) {
      current = { heading: "", body: line };
      continue;
    }
    current.body = current.body ? `${current.body}\n${line}` : line;
  }
  if (current) sections.push(current);
  return sections;
}

function trimSnippet(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_SNIPPET_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_SNIPPET_CHARS).trimEnd()}…`;
}

function extractBestSnippet(question: string, doc: KnowledgeDoc): string {
  const sections = splitMarkdownSections(doc.content)
    .map((section) => ({
      section,
      score: scoreText(question, `${section.heading}\n${section.body}`),
      text: [section.heading, section.body].filter(Boolean).join("\n").trim(),
    }))
    .filter((x) => x.score > 0 && x.text.length > 0)
    .sort((a, b) => b.score - a.score);

  if (sections.length) {
    return trimSnippet(sections.slice(0, 2).map((x) => x.text).join("\n\n"));
  }

  const keywords = questionKeywords(question);
  const lines = doc.content.split(/\r?\n/);
  const scored = lines
    .map((line) => {
      const normalized = toSearchableText(line);
      if (!normalized) return { line, s: 0 };
      let s = 0;
      for (const keyword of keywords) {
        if (normalized.includes(keyword)) s += 1;
      }
      return { line: line.trim(), s };
    })
    .filter((x) => x.line.length > 0)
    .sort((a, b) => b.s - a.s);

  return trimSnippet(scored.slice(0, 6).map((x) => x.line).join("\n"));
}

export async function retrieveKnowledgeContext(question: string): Promise<{
  contextPrompt: string | null;
  sources: string[];
  fallbackMessage?: string;
}> {
  const docs = await loadKnowledgeDocs();
  if (!docs.length) {
    return {
      contextPrompt: null,
      sources: [],
      fallbackMessage:
        "Hiện chưa có knowledge docs trong server. Bạn thêm tài liệu vào `apps/server/rag/docs`.",
    };
  }

  const ranked = docs
    .map((doc) => ({ doc, score: scoreDoc(question, doc) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!ranked.length) {
    return {
      contextPrompt: null,
      sources: [],
      fallbackMessage:
        "Mình chưa tìm thấy thông tin phù hợp trong knowledge base. Bạn thử hỏi cụ thể hơn.",
    };
  }

  const contextText = ranked
    .map((x) => `Source: ${x.doc.file}\n${extractBestSnippet(question, x.doc)}`)
    .join("\n\n---\n\n");
  const contextPrompt = [
    "Trả lời ngắn gọn, chính xác bằng tiếng Việt dựa trên Knowledge Context bên dưới.",
    "Ưu tiên nội dung trong context; chỉ nói không đủ dữ liệu khi context hoàn toàn không liên quan.",
    "",
    `Question: ${question}`,
    "",
    "Knowledge Context:",
    contextText,
  ].join("\n");

  return { contextPrompt, sources: ranked.map((x) => x.doc.file) };
}
