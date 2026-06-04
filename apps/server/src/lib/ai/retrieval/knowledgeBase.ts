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

function scoreDoc(question: string, doc: KnowledgeDoc): number {
  const q = toSearchableText(question);
  const normalizedContent = toSearchableText(doc.content);
  const lines = normalizedContent.split(/\r?\n/);
  const keywords = q
    .split(/[^a-z0-9\u00C0-\u024F]+/i)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);
  if (!keywords.length) return 0;
  let score = 0;
  for (const keyword of keywords) {
    if (normalizedContent.includes(keyword)) score += 2;
    if (lines.some((line) => line.includes(keyword))) score += 1;
  }
  return score;
}

function extractBestSnippet(question: string, doc: KnowledgeDoc): string {
  const q = toSearchableText(question);
  const lines = doc.content.split(/\r?\n/);
  const scored = lines
    .map((line) => {
      const lower = line.toLowerCase();
      let s = 0;
      if (!lower.trim()) return { line, s: 0 };
      for (const token of q.split(/\s+/)) {
        if (token.length >= 3 && lower.includes(token)) s += 1;
      }
      return { line: line.trim(), s };
    })
    .filter((x) => x.line.length > 0)
    .sort((a, b) => b.s - a.s);
  return scored
    .slice(0, 3)
    .map((x) => x.line)
    .join("\n");
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
    "Trả lời dựa trên knowledge context bên dưới.",
    "Nếu context không đủ thì nói rõ không đủ dữ liệu.",
    "",
    `Question: ${question}`,
    "",
    "Knowledge Context:",
    contextText,
  ].join("\n");

  return { contextPrompt, sources: ranked.map((x) => x.doc.file) };
}
