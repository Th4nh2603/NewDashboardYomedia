import React, { useState, useRef, useEffect } from "react";
import JSZip from "jszip";
import { useError } from "../contexts/ErrorContext";
import { useAuth } from "../contexts/AuthContext";
import { getYomediaDemoPreviewUrl } from "./OpenDemo";
import { loadCreativeDemos } from "../data/creativeDemos";
import { fetchJsonOrThrow } from "../lib/apiError";
import { api } from "../lib/trpc/api";
import { recordActivity } from "../lib/activityLog";
import {
  CHAT_AI_PROVIDER_OPTIONS,
  chatProviderLabel,
  loadChatAiProvider,
  saveChatAiProvider,
  type ChatAiProvider,
} from "../lib/chatAiProvider";
import { serverApiOrigin } from "../lib/serverApiOrigin";
import { createSftpClient } from "../lib/sftpClient";
import {
  extractUploadDemoBrandFromText,
  getBuildDemoBrandOptions,
  getPermittedBuildDemoBrandOptions,
  isBuildDemoBrandAllowed,
  resolveCanonicalBuildDemoBrand,
} from "../lib/buildDemoBrands";
import {
  compressImageToDataUrl,
  convertTextFileWithBase64Images,
  resolveAvailableRemotePath,
  stripRedundantRelativeFolderPrefix,
  uploadVideoDemo,
  type VideoPreviewLink,
} from "../lib/buildDemo";
import {
  detectDeleteDemoIntent,
  extractDeleteDemoPathFromInput,
  isDeleteDemoHelpQuestion,
} from "../lib/chatDemoCommands";
import Button from "./Button";

type ChatMessage = {
  id: string;
  role: "user" | "model";
  content: string;
};

type ChatAttachment = {
  id: string;
  file: File;
  relativePath: string;
};

type UploadDemoKind = "html" | "video";

type PendingUploadDemoAction = {
  tool: "build_demo_convert_upload";
  uploadKind?: UploadDemoKind;
  remotePath?: string | null;
  brand?: string | null;
  demoId?: string | null;
  demoValue?: string | null;
  overwrite?: boolean;
  requiredInputs?: string[];
  /** User must re-pick format after a failed format mapping. */
  pendingFormatReselect?: boolean;
  /** Numbered format choices from the last mismatch prompt. */
  pendingFormatOptions?: FormatPickerOption[];
  /** Brand choices the current user is allowed to upload. */
  pendingBrandOptions?: BrandPickerOption[];
};

type LastUploadedDemoSession = {
  remoteBase: string;
  remotePath: string;
  brand: string | null;
  uploadKind: UploadDemoKind;
  uploadedAt: number;
};

type DeleteUploadedDemoAction = {
  tool: "delete_uploaded_demo";
  remotePath?: string | null;
};

const LAST_UPLOADED_DEMO_STORAGE_PREFIX = "yomedia-chat-last-demo:";

function lastUploadedDemoStorageKey(email: string): string {
  return `${LAST_UPLOADED_DEMO_STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

function loadLastUploadedDemoFromSession(
  email: string,
): LastUploadedDemoSession | null {
  if (!email.trim()) return null;
  try {
    const raw = sessionStorage.getItem(lastUploadedDemoStorageKey(email));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastUploadedDemoSession;
    if (!parsed?.remoteBase || !parsed?.remotePath) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveLastUploadedDemoToSession(
  email: string,
  demo: LastUploadedDemoSession | null,
): void {
  if (!email.trim()) return;
  const key = lastUploadedDemoStorageKey(email);
  if (!demo) {
    sessionStorage.removeItem(key);
    return;
  }
  sessionStorage.setItem(key, JSON.stringify(demo));
}

function normalizeDemoRemoteTarget(raw: string): {
  remoteBase: string;
  remotePath: string;
} {
  const trimmed = String(raw || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
  if (!trimmed) {
    return { remoteBase: "", remotePath: "" };
  }
  if (trimmed.startsWith("/script/demo/")) {
    const remoteBase = trimmed.replace(/\/{2,}/g, "/");
    return {
      remoteBase,
      remotePath: remoteBase.replace(/^\/script\/demo\//i, ""),
    };
  }
  const remotePath = trimmed
    .replace(/^\/+/, "")
    .replace(/^script\/demo\//i, "");
  return {
    remotePath,
    remoteBase: `/script/demo/${remotePath}`.replace(/\/{2,}/g, "/"),
  };
}

function extractBrandFromDemoRemotePath(remotePath: string): string | null {
  const { remotePath: rel } = normalizeDemoRemoteTarget(remotePath);
  const parts = rel.split("/").filter(Boolean);
  if (parts.length < 3) return null;
  return resolveCanonicalBuildDemoBrand(parts[2] ?? "") ?? parts[2] ?? null;
}

type FormatCatalogMatch = {
  item: Awaited<ReturnType<typeof loadCreativeDemos>>[number];
  score: number;
};

type FormatPickerOption = {
  value: string;
  title: string;
  sizes: string;
};

type BrandPickerOption = {
  id: string;
  label: string;
};

const MIN_CONFIDENT_FORMAT_MATCH_SCORE = 70;

type UploadProgressState = {
  percent: number;
  label: string;
};

const BUILD_DEMO_BRAND_OPTIONS = getBuildDemoBrandOptions();
const BUILD_DEMO_BRAND_BY_KEY = new Map(
  BUILD_DEMO_BRAND_OPTIONS.map((item) => [normalizePathToken(item.id), item.id]),
);

/** Relative demo path (e.g. `2026/03/.../384x683`) — same as Open Demo input. */
function tryExtractDemoRemotePath(raw: string): string | null {
  const normalized = raw
    .trim()
    .replace(/\u00d7/g, "x")
    .replace(/×/g, "x")
    .replace(/^[`'"\u201c\u201d]+|[`'"\u201c\u201d]+$/g, "");
  if (!normalized || /\n/.test(normalized)) return null;
  if (normalized.length > 512) return null;

  const stripped = normalized
    .replace(/^\/script\/demo\/?/i, "")
    .replace(/^\/+/, "");
  const segments = stripped.split("/").filter(Boolean);
  if (segments.length < 3) return null;

  const last = segments[segments.length - 1] ?? "";
  if (!/^\d{2,4}x\d{2,4}$/i.test(last)) return null;
  if (!/^\d{4}$/.test(segments[0] ?? "")) return null;

  return stripped;
}

function renderPlainWithOptionalLinks(
  text: string,
  keyPrefix: string,
): React.ReactNode[] {
  const urlRe = /(https?:\/\/[^\s<>`]+)/g;
  const out: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = urlRe.exec(text)) !== null) {
    const idx = match.index;
    const href = match[1] ?? match[0];
    if (idx > lastIndex) out.push(text.slice(lastIndex, idx));
    out.push(
      <a
        key={`${keyPrefix}-u-${i++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2 break-all"
      >
        {href}
      </a>,
    );
    lastIndex = idx + (match[0]?.length ?? 0);
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return out.length ? out : [text];
}

function renderInlineMarkdown(text: string) {
  // Minimal, safe renderer for: **bold**, `code`, and normal text.
  // (No HTML parsing; purely React elements.)
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const idx = match.index;
    const token = match[0] ?? "";
    if (idx > lastIndex) {
      for (const node of renderPlainWithOptionalLinks(
        text.slice(lastIndex, idx),
        `${idx}-t`,
      )) {
        parts.push(node);
      }
    }

    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong
          key={`${idx}-b`}
          className="font-semibold text-slate-900 dark:text-slate-100"
        >
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={`${idx}-c`}
          className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 dark:bg-slate-700/60 dark:text-slate-100 font-mono text-[0.9em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      parts.push(token);
    }
    lastIndex = idx + token.length;
  }
  if (lastIndex < text.length) {
    for (const node of renderPlainWithOptionalLinks(
      text.slice(lastIndex),
      "end-t",
    )) {
      parts.push(node);
    }
  }
  return parts;
}

function renderPrettyMessage(content: string) {
  const text = content || "";
  const lines = text.split(/\r?\n/);

  // Code fences ```...```
  const blocks: React.ReactNode[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let textLines: string[] = [];

  const flushText = (key: string) => {
    const joined = textLines.join("\n").trimEnd();
    if (!joined) return;
    blocks.push(
      <div
        key={key}
        className="whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200"
      >
        {joined.split(/\r?\n/).map((l, i) => (
          <div key={`${key}-l-${i}`}>{renderInlineMarkdown(l)}</div>
        ))}
      </div>,
    );
    textLines = [];
  };

  const flushCode = (key: string) => {
    const joined = codeLines.join("\n").trimEnd();
    if (!joined) return;
    blocks.push(
      <pre
        key={key}
        className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
      >
        <code>{joined}</code>
      </pre>,
    );
    codeLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.trim().startsWith("```")) {
      if (!inCode) {
        flushText(`t-${i}`);
        inCode = true;
      } else {
        flushCode(`c-${i}`);
        inCode = false;
      }
      continue;
    }
    if (inCode) codeLines.push(line);
    else textLines.push(line);
  }
  if (inCode) flushCode("c-end");
  flushText("t-end");

  return <div className="space-y-2">{blocks}</div>;
}

function renderColoredContent(content: string) {
  const lines = (content || "").split(/\r?\n/).filter((l) => l.trim() !== "");

  // Only apply coloring to our structured status messages.
  const hasStructured =
    lines.some((l) => l.startsWith("Directory:")) ||
    lines.some((l) => l.startsWith("SFTP:"));
  if (!hasStructured) return renderPrettyMessage(content);

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        if (line.startsWith("Directory:")) {
          const value = line.replace(/^Directory:\s*/i, "");
          return (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                Directory
              </span>
              <span className="font-mono text-sm break-all text-slate-900 dark:text-slate-100">
                {value}
              </span>
            </div>
          );
        }

        if (line.startsWith("SFTP:")) {
          const isOk = line.includes("EXISTS.") || line.includes("ĐÃ TỒN TẠI");
          const isMissing =
            line.includes("NOT FOUND.") || line.includes("CHƯA TỒN TẠI");
          const badgeClass = isOk
            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/20"
            : isMissing
              ? "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/20"
              : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/20";
          return (
            <div key={idx} className="flex items-center gap-2">
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}
              >
                SFTP
              </span>
              <span className="text-sm text-slate-800 dark:text-slate-200">
                {line.replace(/^SFTP:\s*/i, "")}
              </span>
            </div>
          );
        }

        if (
          line.toLowerCase().includes("banner can be set up") ||
          line.toLowerCase().includes("banner có thể setup")
        ) {
          return (
            <div key={idx} className="inline-flex items-center gap-2">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-500/20">
                Setup
              </span>
              <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">
                {line}
              </span>
            </div>
          );
        }

        if (
          line.toLowerCase().includes("could not verify sftp") ||
          line.toLowerCase().includes("network/server error") ||
          line.toLowerCase().includes("không kiểm tra được sftp")
        ) {
          return (
            <div
              key={idx}
              className="text-sm text-amber-700 dark:text-amber-300"
            >
              {line}
            </div>
          );
        }

        return (
          <div key={idx} className="text-sm text-slate-800 dark:text-slate-200">
            {renderInlineMarkdown(line)}
          </div>
        );
      })}
    </div>
  );
}

function summarizePrompt(input: string): string {
  const compact = input.replace(/\s+/g, " ").trim();
  if (compact.length <= 120) return compact;
  return `${compact.slice(0, 117)}...`;
}

function toPosixPath(input: string): string {
  return input.replace(/\\+/g, "/").replace(/^\/+/, "");
}

function normalizePathToken(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function extractSizeTokenFromRemotePath(remotePath: string): string | null {
  const parts = remotePath.split("/").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const seg = (parts[i] ?? "").toLowerCase();
    const exact = seg.match(/^(\d{2,4}x\d{2,4})$/);
    if (exact?.[1]) return exact[1];
    const withSuffix = seg.match(/^(\d{2,4}x\d{2,4})-\d+$/);
    if (withSuffix?.[1]) return withSuffix[1];
  }
  return null;
}

function hasDemoSizeMatch(
  demoSize: string | string[] | undefined,
  sizeToken: string,
): boolean {
  const key = sizeToken.toLowerCase();
  if (Array.isArray(demoSize)) {
    return demoSize.some((entry) => String(entry ?? "").trim().toLowerCase() === key);
  }
  return String(demoSize ?? "").trim().toLowerCase() === key;
}

function scoreFormatCatalogItem(
  item: Awaited<ReturnType<typeof loadCreativeDemos>>[number],
  needle: string,
): number {
  const value = normalizePathToken(String(item.value ?? ""));
  const format = normalizePathToken(String(item.format ?? ""));
  const title = normalizePathToken(String(item.title ?? ""));
  const id = normalizePathToken(String(item.id ?? ""));
  if (needle === value) return 100;
  if (needle === format) return 95;
  if (needle === id) return 90;
  if (needle === title) return 85;
  if (value.includes(needle) || needle.includes(value)) return 70;
  if (format && (format.includes(needle) || needle.includes(format))) return 65;
  if (title.includes(needle) || needle.includes(title)) return 60;
  return 0;
}

function rankFormatCatalogMatches(
  demos: Awaited<ReturnType<typeof loadCreativeDemos>>,
  rawInput: string,
): FormatCatalogMatch[] {
  const needle = normalizePathToken(rawInput);
  if (!needle) return [];
  return demos
    .map((item) => ({ item, score: scoreFormatCatalogItem(item, needle) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        String(a.item.title ?? "").localeCompare(String(b.item.title ?? "")),
    );
}

function resolveFormatValueFromCatalog(
  demos: Awaited<ReturnType<typeof loadCreativeDemos>>,
  rawInput: string,
): string | undefined {
  const best = rankFormatCatalogMatches(demos, rawInput)[0];
  const value = String(best?.item.value ?? "").trim();
  return value || undefined;
}

function findExactCatalogFormatValue(
  demos: Awaited<ReturnType<typeof loadCreativeDemos>>,
  rawInput: string,
): string | undefined {
  const needle = normalizePathToken(rawInput);
  if (!needle) return undefined;
  const row = demos.find(
    (item) => normalizePathToken(String(item.value ?? "")) === needle,
  );
  const value = String(row?.value ?? "").trim();
  return value || undefined;
}

function formatDemoSizeLabel(
  demoSize: string | string[] | undefined,
): string {
  if (Array.isArray(demoSize)) {
    const parts = demoSize
      .map((entry) => String(entry ?? "").trim())
      .filter((entry) => entry && entry !== "-");
    return parts.length > 0 ? parts.join(", ") : "-";
  }
  const single = String(demoSize ?? "").trim();
  return single && single !== "-" ? single : "-";
}

function buildFormatPickerOptions(
  matches: FormatCatalogMatch[],
  limit = 8,
): FormatPickerOption[] {
  const seen = new Set<string>();
  const options: FormatPickerOption[] = [];
  for (const match of matches) {
    const value = String(match.item.value ?? "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    options.push({
      value,
      title: String(match.item.title ?? value).trim() || value,
      sizes: formatDemoSizeLabel(match.item.size),
    });
    if (options.length >= limit) break;
  }
  return options;
}

function buildFormatMismatchOptions(
  demos: Awaited<ReturnType<typeof loadCreativeDemos>>,
  userInput: string,
  pathSize: string | null,
  keywordMatches: FormatCatalogMatch[],
): FormatPickerOption[] {
  let merged: FormatCatalogMatch[] = pathSize
    ? keywordMatches.filter((entry) =>
        hasDemoSizeMatch(entry.item.size, pathSize),
      )
    : [...keywordMatches];

  if (pathSize) {
    const seen = new Set(
      merged.map((entry) => String(entry.item.value ?? "").trim()),
    );
    for (const item of demos) {
      if (!hasDemoSizeMatch(item.size, pathSize)) continue;
      const value = String(item.value ?? "").trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      merged.push({ item, score: 55 });
    }
  }

  merged.sort(
    (a, b) =>
      b.score - a.score ||
      String(a.item.title ?? "").localeCompare(String(b.item.title ?? "")),
  );
  return buildFormatPickerOptions(merged, 10);
}

function buildFormatMismatchMessage(params: {
  userInput: string;
  pathSize: string | null;
  reason: "no_match" | "size_incompatible";
  options: FormatPickerOption[];
}): string {
  const sizeHint = params.pathSize ? ` (size demo: ${params.pathSize})` : "";
  const intro =
    params.reason === "size_incompatible"
      ? `Format \`${params.userInput}\` không phù hợp với demo này${sizeHint}. Format bạn chọn không khớp kích thước hoặc loại placement của file demo.`
      : `Format \`${params.userInput}\` không khớp danh sách format hỗ trợ${sizeHint}.`;
  const list =
    params.options.length > 0
      ? params.options
          .map(
            (option, index) =>
              `${index + 1}. \`${option.value}\` — ${option.title} (${option.sizes})`,
          )
          .join("\n")
      : "Không tìm thấy format gợi ý. Thử nhập đúng `value` từ Creative Showcase.";
  return [
    intro,
    "",
    "Vui lòng chọn một format bên dưới và gõ lại, ví dụ:",
    `\`format: ${params.options[0]?.value ?? "display-balloon-standard"}\``,
    params.options.length > 0
      ? `Hoặc gõ số thứ tự (1–${params.options.length}).`
      : null,
    "",
    list,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

async function validateUploadDemoFormat(params: {
  remotePath: string;
  demoId?: string | null;
  demoValue?: string | null;
}): Promise<
  | { ok: true; formatValue: string }
  | {
      ok: false;
      userInput: string;
      reason: "no_match" | "size_incompatible";
      options: FormatPickerOption[];
    }
> {
  const explicitValue = String(params.demoValue ?? "").trim();
  const demos = await loadCreativeDemos();
  const pathSize = extractSizeTokenFromRemotePath(params.remotePath);

  const explicitId = String(params.demoId ?? "").trim();
  if (explicitId) {
    const byId = demos.find((item) => String(item.id).trim() === explicitId);
    const value = String(byId?.value ?? "").trim();
    if (value) return { ok: true, formatValue: value };
  }

  if (!explicitValue) {
    const resolved = await resolveFormatForPreview(params);
    if (resolved.formatValue) {
      return { ok: true, formatValue: resolved.formatValue };
    }
    const sizeMatches = pathSize
      ? demos
          .filter((item) => hasDemoSizeMatch(item.size, pathSize))
          .map((item) => ({ item, score: 55 }))
      : [];
    return {
      ok: false,
      userInput: explicitValue,
      reason: "no_match",
      options: buildFormatPickerOptions(sizeMatches, 10),
    };
  }

  const exactValue = findExactCatalogFormatValue(demos, explicitValue);
  if (exactValue) {
    return { ok: true, formatValue: exactValue };
  }

  const keywordMatches = rankFormatCatalogMatches(demos, explicitValue);
  const best = keywordMatches[0];
  if (!best || best.score < MIN_CONFIDENT_FORMAT_MATCH_SCORE) {
    return {
      ok: false,
      userInput: explicitValue,
      reason: "no_match",
      options: buildFormatMismatchOptions(
        demos,
        explicitValue,
        pathSize,
        keywordMatches,
      ),
    };
  }

  const matchedValue = String(best.item.value ?? "").trim();
  if (pathSize && !hasDemoSizeMatch(best.item.size, pathSize)) {
    return {
      ok: false,
      userInput: explicitValue,
      reason: "size_incompatible",
      options: buildFormatMismatchOptions(
        demos,
        explicitValue,
        pathSize,
        keywordMatches,
      ),
    };
  }

  if (!matchedValue) {
    return {
      ok: false,
      userInput: explicitValue,
      reason: "no_match",
      options: buildFormatMismatchOptions(
        demos,
        explicitValue,
        pathSize,
        keywordMatches,
      ),
    };
  }

  return { ok: true, formatValue: matchedValue };
}

function inferUploadRemotePathFromAttachments(
  plan: {
    remotePath?: string | null;
    brand?: string | null;
  },
  attachmentItems: ChatAttachment[],
): string {
  const requestedRemotePath = String(plan.remotePath || "").trim();
  if (requestedRemotePath) return requestedRemotePath;

  const htmlItems = attachmentItems.filter((item) => isHtmlFile(item.file));
  const jsItems = attachmentItems.filter((item) => {
    const ext = (item.file.name.split(".").pop() ?? "").toLowerCase();
    return ext === "js";
  });
  const videoItems = attachmentItems.filter((item) => isVideoFile(item.file));
  const selectedHtml = htmlItems[0] ?? null;
  const selectedJs = jsItems[0] ?? null;
  const selectedVideo = videoItems[0] ?? null;

  const normalizedBrand = resolveAllowedBuildDemoBrand(
    String(plan.brand || "").trim(),
  );
  const brandToken = normalizePathToken(normalizedBrand || "")
    .replace(/^brand-+/g, "")
    .trim();
  const inferredUploadToken = normalizePathToken(
    (
      selectedHtml?.file.name ||
      selectedJs?.file.name ||
      selectedVideo?.file.name ||
      "upload"
    ).replace(/\.[^.]+$/, ""),
  );
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return [year, month, brandToken, "all", "html", inferredUploadToken]
    .filter(Boolean)
    .join("/");
}

async function resolveFormatForPreview(params: {
  remotePath: string;
  demoId?: string | null;
  demoValue?: string | null;
}): Promise<{ formatValue?: string; suggestions: string[] }> {
  const explicitValue = String(params.demoValue ?? "").trim();
  const demos = await loadCreativeDemos();
  const size = extractSizeTokenFromRemotePath(params.remotePath);

  if (explicitValue) {
    const exactValue = findExactCatalogFormatValue(demos, explicitValue);
    if (exactValue) {
      return { formatValue: exactValue, suggestions: [] };
    }
    const keywordMatches = rankFormatCatalogMatches(demos, explicitValue);
    const best = keywordMatches[0];
    if (best && best.score >= MIN_CONFIDENT_FORMAT_MATCH_SCORE) {
      const matchedValue = String(best.item.value ?? "").trim();
      if (
        matchedValue &&
        (!size || hasDemoSizeMatch(best.item.size, size))
      ) {
        return { formatValue: matchedValue, suggestions: [] };
      }
    }
  }

  const explicitId = String(params.demoId ?? "").trim();
  if (explicitId) {
    const byId = demos.find((item) => String(item.id).trim() === explicitId);
    const value = String(byId?.value ?? "").trim();
    if (value) return { formatValue: value, suggestions: [] };
  }

  if (!size) return { suggestions: [] };
  const key = size.toLowerCase();
  const matchedBySize = demos.filter((item) => hasDemoSizeMatch(item.size, key));
  if (matchedBySize.length === 0) return { suggestions: [] };

  const preferred =
    matchedBySize.find(
      (item) =>
        String(item.category ?? "").trim().toLowerCase() === "display" &&
        String(item.fileType ?? "").trim().toLowerCase() === "html5",
    ) ??
    matchedBySize.find(
      (item) => String(item.category ?? "").trim().toLowerCase() === "display",
    ) ??
    matchedBySize[0];
  const formatValue = String(preferred?.value ?? "").trim() || undefined;
  const suggestions = matchedBySize
    .map((item) => String(item.value ?? "").trim())
    .filter(Boolean)
    .slice(0, 5);
  return { formatValue, suggestions };
}

async function inferFormatValueBySize(
  remotePath: string,
): Promise<string | undefined> {
  const resolved = await resolveFormatForPreview({ remotePath });
  return resolved.formatValue;
}

function guessMimeFromName(name: string): string {
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  if (ext === "html" || ext === "htm") return "text/html";
  if (ext === "js") return "application/javascript";
  if (ext === "json") return "application/json";
  if (ext === "css") return "text/css";
  if (ext === "mp4") return "video/mp4";
  if (ext === "webm") return "video/webm";
  if (ext === "mov") return "video/quicktime";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
    return `image/${ext === "svg" ? "svg+xml" : ext}`;
  }
  return "application/octet-stream";
}

function extractBrandFromInput(input: string): string | null {
  return extractUploadDemoBrandFromText(input);
}

function resolveAllowedBuildDemoBrand(value: string): string | null {
  return resolveCanonicalBuildDemoBrand(value);
}

function suggestBuildDemoBrands(
  rawInput: string,
  allowed?: string[] | null,
): string[] {
  const key = normalizePathToken(rawInput);
  const permitted = getPermittedBuildDemoBrandOptions(allowed);
  const options =
    permitted.length > 0
      ? permitted.map((item) => item.id)
      : allowed === null
        ? BUILD_DEMO_BRAND_OPTIONS.map((item) => item.id)
        : [];
  if (!key) return options.slice(0, 5);
  const ranked = options
    .map((id) => {
      const normalized = normalizePathToken(id);
      let score = 0;
      if (normalized === key) score = 100;
      else if (normalized.startsWith(key) || key.startsWith(normalized)) score = 80;
      else if (normalized.includes(key) || key.includes(normalized)) score = 60;
      return { id, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  if (ranked.length > 0) return ranked.slice(0, 5).map((entry) => entry.id);
  return options.slice(0, 5);
}

function buildPendingBrandOptions(
  allowed: string[] | null | undefined,
): BrandPickerOption[] {
  return getPermittedBuildDemoBrandOptions(allowed).map((item) => ({
    id: item.id,
    label: item.label || item.id,
  }));
}

function buildBrandSelectionMessage(options: BrandPickerOption[]): string {
  if (options.length === 0) {
    return "Bạn chưa được cấp quyền upload demo cho brand nào. Liên hệ admin để được cấp quyền.";
  }
  const list = options
    .map(
      (option, index) =>
        `${index + 1}. \`${option.id}\`${option.label !== option.id ? ` — ${option.label}` : ""}`,
    )
    .join("\n");
  return [
    "Chọn brand bạn được phép upload:",
    "",
    "Ví dụ:",
    `\`brand: ${options[0]?.id ?? "yomedia"}\``,
    options.length > 0 ? `Hoặc gõ số thứ tự (1–${options.length}).` : null,
    "",
    list,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function resolveBrandFromOptionSelection(
  input: string,
  options: BrandPickerOption[] | undefined,
): string | null {
  if (!options || options.length === 0) return null;
  const index = extractFormatOptionIndexFromInput(input);
  if (index == null || index > options.length) return null;
  const id = String(options[index - 1]?.id ?? "").trim();
  return id || null;
}

function buildBuildDemoBrandPermissionDeniedMessage(
  brandId: string,
  allowed: string[] | null | undefined,
): string {
  const label = brandId.trim() || "brand này";
  if (allowed && allowed.length > 0) {
    return `Bạn không có quyền upload/build demo cho brand \`${label}\`. Brand được phép: ${allowed.join(", ")}. Liên hệ admin nếu cần thêm quyền.`;
  }
  return `Bạn không có quyền upload/build demo cho brand \`${label}\`. Liên hệ admin để được cấp quyền.`;
}

function checkBuildDemoBrandUserPermission(
  brandId: string,
  allowed: string[] | null | undefined,
): string | null {
  const normalized = String(brandId || "").trim();
  if (!normalized) return null;
  if (isBuildDemoBrandAllowed(normalized, allowed)) return null;
  return buildBuildDemoBrandPermissionDeniedMessage(normalized, allowed);
}

function tryGetUploadDemoBrandPermissionError(
  action: PendingUploadDemoAction,
  allowed: string[] | null | undefined,
): string | null {
  const raw = String(action.brand ?? "").trim();
  if (!raw) return null;
  const canonical = resolveAllowedBuildDemoBrand(raw);
  if (!canonical) return null;
  return checkBuildDemoBrandUserPermission(canonical, allowed);
}

function assertBuildDemoBrandUserPermission(
  brandId: string,
  allowed: string[] | null | undefined,
): void {
  const denied = checkBuildDemoBrandUserPermission(brandId, allowed);
  if (denied) throw new Error(denied);
}

const VIDEO_FORMAT_ALIASES: Record<string, string> = {
  oustream: "outstream",
  outsteam: "outstream",
  insteam: "instream",
};

function normalizeVideoFormatInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return VIDEO_FORMAT_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

function extractFormatFromInput(input: string): string | null {
  const explicit = input.match(
    /\b(?:format|demoValue|demo_value|value)\s*[:=]\s*([a-z0-9][a-z0-9 _-]{2,80})\b/i,
  );
  if (explicit?.[1]) return normalizeVideoFormatInput(explicit[1]);

  const plain = input.match(
    /\b(?:format|demoValue|demo_value|value)\s+([a-z0-9][a-z0-9 _-]{2,80})\b/i,
  );
  if (plain?.[1]) return normalizeVideoFormatInput(plain[1]);
  return null;
}

function extractFormatOptionIndexFromInput(input: string): number | null {
  const match = input.trim().match(/^#?(\d{1,2})$/);
  if (!match?.[1]) return null;
  const index = Number.parseInt(match[1], 10);
  return Number.isFinite(index) && index > 0 ? index : null;
}

function resolveFormatFromOptionSelection(
  input: string,
  options: FormatPickerOption[] | undefined,
): string | null {
  if (!options || options.length === 0) return null;
  const index = extractFormatOptionIndexFromInput(input);
  if (index == null || index > options.length) return null;
  const value = String(options[index - 1]?.value ?? "").trim();
  return value || null;
}

function computePendingUploadMissingInputs(
  action: PendingUploadDemoAction,
  attachmentCount: number,
  uploadKind: UploadDemoKind = action.uploadKind ?? "html",
  allowedBuildDemoBrands?: string[] | null,
): string[] {
  const required = new Set(action.requiredInputs ?? []);
  const missing: string[] = [];
  const rawBrand = String(action.brand ?? "").trim();
  const validBrand = resolveAllowedBuildDemoBrand(rawBrand);
  const hasBrandValue = Boolean(rawBrand);
  if ((required.has("brand") || hasBrandValue) && !validBrand) {
    missing.push("brand");
  } else if (
    validBrand &&
    checkBuildDemoBrandUserPermission(validBrand, allowedBuildDemoBrands)
  ) {
    missing.push("brand");
  }
  if (
    uploadKind !== "video" &&
    (required.has("format") || action.pendingFormatReselect) &&
    !String(action.demoValue ?? "").trim() &&
    !String(action.demoId ?? "").trim()
  ) {
    missing.push("format");
  }
  if (required.has("attachments") && attachmentCount === 0) {
    missing.push("attachments");
  }
  if (uploadKind === "video" && attachmentCount !== 1) {
    missing.push("single_video");
  }
  return missing;
}

function formatMissingUploadInputs(missing: string[]): {
  labels: string;
  examples: string;
} {
  const uniq = Array.from(new Set(missing));
  const labelMap: Record<string, string> = {
    brand: "brand",
    format: "format",
    attachments: "file đính kèm",
  };
  const exampleMap: Record<string, string> = {
    brand: "`brand: yomedia`",
    format: "`format: 300x250`",
    attachments: "đính kèm folder/file demo",
  };
  const labels = uniq.map((k) => labelMap[k] ?? k).join(", ");
  const examples = uniq
    .map((k) => exampleMap[k])
    .filter((x): x is string => Boolean(x))
    .join(", ");
  return { labels, examples };
}

function buildMissingUploadInputsMessage(
  action: PendingUploadDemoAction,
  missing: string[],
  allowed?: string[] | null,
): string {
  const hasMissingBrand = missing.includes("brand");
  const rawBrand = String(action.brand ?? "").trim();
  const canonicalBrand = resolveAllowedBuildDemoBrand(rawBrand);
  if (hasMissingBrand && rawBrand && canonicalBrand) {
    const denied = checkBuildDemoBrandUserPermission(canonicalBrand, allowed);
    if (denied) {
      return [denied, "", buildBrandSelectionMessage(buildPendingBrandOptions(allowed))].join(
        "\n",
      );
    }
  }
  if (hasMissingBrand && rawBrand) {
    const suggestions = suggestBuildDemoBrands(rawBrand, allowed);
    return `Brand \`${rawBrand}\` không có trong danh sách. Vui lòng nhập lại brand hợp lệ${
      suggestions.length > 0 ? ` (gợi ý: ${suggestions.join(", ")})` : ""
    }.`;
  }
  if (hasMissingBrand) {
    return buildBrandSelectionMessage(buildPendingBrandOptions(allowed));
  }
  const hint = formatMissingUploadInputs(missing);
  return `Còn thiếu: ${hint.labels}. Ví dụ: ${hint.examples}.`;
}

function tryGetBrandInputPermissionError(
  input: string,
  pending: PendingUploadDemoAction,
  allowed?: string[] | null,
): string | null {
  const explicitBrand = extractBrandFromInput(input);
  const selectedBrandFromList = resolveBrandFromOptionSelection(
    input,
    pending.pendingBrandOptions,
  );
  const brandCandidate =
    explicitBrand ??
    selectedBrandFromList ??
    ((pending.requiredInputs ?? []).includes("brand") &&
    /^[a-z0-9][a-z0-9 _-]{1,60}$/i.test(input.trim())
      ? input.trim()
      : null);
  if (!brandCandidate) return null;
  const canonical = resolveAllowedBuildDemoBrand(brandCandidate);
  if (!canonical) return null;
  return checkBuildDemoBrandUserPermission(canonical, allowed);
}

function withBrandRequirement(
  action: PendingUploadDemoAction,
  allowed: string[] | null | undefined,
): PendingUploadDemoAction {
  return {
    ...action,
    brand: null,
    pendingBrandOptions: buildPendingBrandOptions(allowed),
    requiredInputs: Array.from(new Set([...(action.requiredInputs ?? []), "brand"])),
  };
}

function applyPendingBrandOptionsIfNeeded(
  action: PendingUploadDemoAction,
  missing: string[],
  allowed: string[] | null | undefined,
): PendingUploadDemoAction {
  if (!missing.includes("brand")) return action;
  return {
    ...action,
    pendingBrandOptions: buildPendingBrandOptions(allowed),
  };
}

function extractPendingUploadSupplements(
  input: string,
  pending: PendingUploadDemoAction,
  allowed?: string[] | null,
): Partial<PendingUploadDemoAction> {
  const updates: Partial<PendingUploadDemoAction> = {};
  const explicitBrand = extractBrandFromInput(input);
  const selectedBrandFromList = resolveBrandFromOptionSelection(
    input,
    pending.pendingBrandOptions,
  );
  const brandCandidate =
    explicitBrand ??
    selectedBrandFromList ??
    ((pending.requiredInputs ?? []).includes("brand") &&
    /^[a-z0-9][a-z0-9 _-]{1,60}$/i.test(input.trim())
      ? input.trim()
      : null);

  if (brandCandidate) {
    const canonical = resolveAllowedBuildDemoBrand(brandCandidate) ?? brandCandidate;
    if (isBuildDemoBrandAllowed(canonical, allowed)) {
      updates.brand = canonical;
      updates.pendingBrandOptions = [];
    }
  }

  const explicitFormat = extractFormatFromInput(input);
  if (explicitFormat) {
    updates.demoValue = explicitFormat;
    updates.pendingFormatReselect = false;
    updates.pendingFormatOptions = [];
  } else if (
    (pending.requiredInputs ?? []).includes("format") ||
    pending.pendingFormatReselect
  ) {
    const selectedFormat = resolveFormatFromOptionSelection(
      input,
      pending.pendingFormatOptions,
    );
    if (selectedFormat) {
      updates.demoValue = selectedFormat;
      updates.pendingFormatReselect = false;
      updates.pendingFormatOptions = [];
    } else {
      const trimmed = input.trim();
      if (/^[a-z0-9][a-z0-9 _-]{2,80}$/i.test(trimmed)) {
        updates.demoValue = normalizeVideoFormatInput(trimmed);
        updates.pendingFormatReselect = false;
        updates.pendingFormatOptions = [];
      }
    }
  }

  return updates;
}

function isUploadDemoTextFile(file: File): boolean {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  return ["html", "htm", "js"].includes(ext);
}

function isHtmlFile(file: File): boolean {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  return ext === "html" || ext === "htm";
}

function isImageFile(file: File): boolean {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  return (
    file.type.startsWith("image/") ||
    ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)
  );
}

function isVideoFile(file: File): boolean {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  return file.type.startsWith("video/") || ["mp4", "webm", "mov"].includes(ext);
}

/** Relative path when drag-dropping folders (webkitRelativePath is read-only on File). */
const chatDropRelativePathByFile = new WeakMap<File, string>();

function readAllDirEntries(
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const acc: FileSystemEntry[] = [];
    const readBatch = () => {
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) {
            resolve(acc);
            return;
          }
          acc.push(...batch);
          readBatch();
        },
        (err) => reject(err),
      );
    };
    readBatch();
  });
}

function readDroppedEntry(
  entry: FileSystemEntry,
  pathPrefix: string,
): Promise<File[]> {
  return new Promise((resolve, reject) => {
    if (entry.isFile) {
      (entry as FileSystemFileEntry).file(
        (file: File) => {
          chatDropRelativePathByFile.set(file, `${pathPrefix}${file.name}`);
          resolve([file]);
        },
        (err) => reject(err),
      );
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const dirPath = `${pathPrefix}${entry.name}/`;
      void readAllDirEntries(reader)
        .then(async (entries) => {
          const nested = await Promise.all(
            entries.map((e) => readDroppedEntry(e, dirPath)),
          );
          resolve(nested.flat());
        })
        .catch(reject);
    } else {
      resolve([]);
    }
  });
}

function isDroppedFolderPlaceholder(file: File): boolean {
  if (file.size !== 0) return false;
  const base = file.name.split(/[/\\]/).pop() ?? file.name;
  if (base.includes(".")) return false;
  const t = file.type || "";
  if (t !== "" && t !== "application/octet-stream") return false;
  return true;
}

function attachmentRelativePath(file: File): string {
  return (
    chatDropRelativePathByFile.get(file)?.trim() ||
    (file as File & { webkitRelativePath?: string }).webkitRelativePath?.trim() ||
    file.name
  );
}

function mergeDroppedChatFiles(list: File[]): File[] {
  const seen = new Set<string>();
  const out: File[] = [];
  for (const f of list) {
    const rel = attachmentRelativePath(f);
    const k = `${rel}\0${f.size}\0${f.lastModified}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(f);
  }
  return out;
}

async function collectFilesFromDataTransfer(
  dataTransfer: DataTransfer,
): Promise<File[]> {
  const fileListFallback = Array.from(dataTransfer.files ?? []).filter(
    (f) => !isDroppedFolderPlaceholder(f),
  );

  type DropSnapshot =
    | { kind: "entry"; entry: FileSystemEntry }
    | { kind: "file"; file: File };

  const snapshots: DropSnapshot[] = [];
  const items = dataTransfer.items;
  if (items?.length) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const entry = (
        item as DataTransferItem & {
          webkitGetAsEntry?: () => FileSystemEntry | null;
        }
      ).webkitGetAsEntry?.();
      if (entry) {
        snapshots.push({ kind: "entry", entry });
      } else if (item.kind === "file") {
        const f = item.getAsFile();
        if (f && !isDroppedFolderPlaceholder(f)) {
          snapshots.push({ kind: "file", file: f });
        }
      }
    }
  }

  const allFiles: File[] = [];
  for (const snap of snapshots) {
    if (snap.kind === "entry") {
      try {
        const files = await readDroppedEntry(snap.entry, "");
        allFiles.push(...files);
      } catch {
        /* ignore */
      }
    } else {
      allFiles.push(snap.file);
    }
  }

  return mergeDroppedChatFiles([...allFiles, ...fileListFallback]);
}

/** Chromium File System Access API — `values()` is not in the default DOM lib. */
type FileSystemDirectoryHandleWithValues = FileSystemDirectoryHandle & {
  values(): AsyncIterable<FileSystemHandle>;
};

async function collectFilesFromDirectoryHandle(
  dir: FileSystemDirectoryHandle,
  pathPrefix = "",
): Promise<File[]> {
  const files: File[] = [];
  for await (const entry of (dir as FileSystemDirectoryHandleWithValues).values()) {
    const rel = `${pathPrefix}${entry.name}`;
    if (entry.kind === "file") {
      const file = await (entry as FileSystemFileHandle).getFile();
      chatDropRelativePathByFile.set(file, rel);
      files.push(file);
    } else if (entry.kind === "directory") {
      files.push(
        ...(await collectFilesFromDirectoryHandle(
          entry as FileSystemDirectoryHandle,
          `${rel}/`,
        )),
      );
    }
  }
  return mergeDroppedChatFiles(files);
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
};

function getDirectoryPicker(): (() => Promise<FileSystemDirectoryHandle>) | null {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  return typeof picker === "function" ? picker.bind(window) : null;
}

async function pickFolderAttachments(): Promise<FileList | null> {
  const showDirectoryPicker = getDirectoryPicker();
  if (!showDirectoryPicker) return null;
  try {
    const dir = await showDirectoryPicker();
    const files = await collectFilesFromDirectoryHandle(dir);
    if (files.length === 0) return null;
    const dt = new DataTransfer();
    files.forEach((file) => dt.items.add(file));
    return dt.files;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return null;
    throw err;
  }
}

type WindowWithOpenFilePicker = Window & {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
  }) => Promise<FileSystemFileHandle[]>;
};

function waitForInputFiles(input: HTMLInputElement): Promise<FileList | null> {
  return new Promise((resolve) => {
    const onChange = () => {
      input.removeEventListener("change", onChange);
      resolve(input.files);
    };
    input.addEventListener("change", onChange);
    input.click();
  });
}

/**
 * One attachment action: native file picker when available, else directory picker
 * (folder), else hidden `<input type="file">`. Upload kind is inferred in handlePickAttachments.
 */
async function pickUnifiedAttachments(
  fileInput: HTMLInputElement | null,
): Promise<FileList | null> {
  const showOpenFilePicker = (window as WindowWithOpenFilePicker).showOpenFilePicker;
  if (typeof showOpenFilePicker === "function") {
    try {
      const handles = await showOpenFilePicker({ multiple: true });
      const dt = new DataTransfer();
      for (const handle of handles) {
        dt.items.add(await handle.getFile());
      }
      return dt.files;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return null;
      throw err;
    }
  }

  if (getDirectoryPicker()) {
    return pickFolderAttachments();
  }

  if (!fileInput) return null;
  return waitForInputFiles(fileInput);
}

function isCreativeVideoDemo(
  item: Awaited<ReturnType<typeof loadCreativeDemos>>[number],
): boolean {
  return String(item.fileType ?? "").trim().toLowerCase() === "video";
}

/** Video-only when every attachment is a video file (BuildDemo format Video). */
function detectUploadDemoKind(items: ChatAttachment[]): UploadDemoKind {
  if (items.length === 0) return "html";
  const videos = items.filter((item) => isVideoFile(item.file));
  if (videos.length === items.length) return "video";
  return "html";
}

function isZipFile(file: File): boolean {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  return ext === "zip" || file.type === "application/zip";
}

function inferUploadBaseToken(items: ChatAttachment[]): string {
  const firstSegments = items
    .map((item) => toPosixPath(item.relativePath || item.file.name))
    .map((value) => value.replace(/^\/+/, "").split("/").filter(Boolean))
    .filter((parts) => parts.length > 1)
    .map((parts) => normalizePathToken(parts[0] || ""));
  if (firstSegments.length === 0) return "";
  const first = firstSegments[0] || "";
  if (!first) return "";
  const same = firstSegments.every((seg) => seg === first);
  return same ? first : "";
}

const ChatView = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [aiProvider, setAiProvider] =
    useState<ChatAiProvider>(loadChatAiProvider);
  const [pendingUploadAction, setPendingUploadAction] =
    useState<PendingUploadDemoAction | null>(null);
  const [lastUploadedDemo, setLastUploadedDemo] =
    useState<LastUploadedDemoSession | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(
    null,
  );
  const { handleApiError } = useError();
  const { user } = useAuth();
  const allowedBuildDemoBrands = user?.allowedBuildDemoBrands;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const normalizedRole = String(user?.role ?? "")
    .trim()
    .toLowerCase();
  const isAdminUser = normalizedRole === "admin";
  const sftpClient = React.useMemo(
    () =>
      createSftpClient({
        roleHeader: normalizedRole || undefined,
      }),
    [normalizedRole],
  );

  const handleProviderChange = (next: ChatAiProvider) => {
    setAiProvider(next);
    saveChatAiProvider(next);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const email = String(user?.email ?? "").trim();
    if (!email) {
      setLastUploadedDemo(null);
      return;
    }
    setLastUploadedDemo(loadLastUploadedDemoFromSession(email));
  }, [user?.email]);

  const rememberLastUploadedDemo = React.useCallback(
    (demo: LastUploadedDemoSession) => {
      setLastUploadedDemo(demo);
      const email = String(user?.email ?? "").trim();
      if (email) saveLastUploadedDemoToSession(email, demo);
    },
    [user?.email],
  );

  const clearLastUploadedDemo = React.useCallback(() => {
    setLastUploadedDemo(null);
    const email = String(user?.email ?? "").trim();
    if (email) saveLastUploadedDemoToSession(email, null);
  }, [user?.email]);

  const handlePickAttachments = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const pickedFiles = Array.from(fileList);
    const next: ChatAttachment[] = [];

    for (const [idx, file] of pickedFiles.entries()) {
      if (!isZipFile(file)) {
        const rel = attachmentRelativePath(file);
        next.push({
          id: `${Date.now()}-${idx}-${file.name}`,
          file,
          relativePath: toPosixPath(rel || file.name),
        });
        continue;
      }

      try {
        const zip = await JSZip.loadAsync(file);
        const zipBase = file.name.replace(/\.zip$/i, "").trim() || "archive";
        let zipItemIndex = 0;

        for (const [entryName, entry] of Object.entries(zip.files)) {
          if (entry.dir) continue;
          const fileBlob = await entry.async("blob");
          const entryLeaf = entryName.split("/").pop() || "file";
          const entryFile = new File([fileBlob], entryLeaf, {
            type: guessMimeFromName(entryLeaf),
          });
          next.push({
            id: `${Date.now()}-${idx}-${zipItemIndex++}-${entryLeaf}`,
            file: entryFile,
            relativePath: toPosixPath(`${zipBase}/${entryName}`),
          });
        }
      } catch (err) {
        const reason =
          err instanceof Error ? err.message : "Unknown zip parse error";
        handleApiError(new Error(`Cannot read zip "${file.name}": ${reason}`));
      }
    }

    setAttachments((prev) => {
      const seen = new Set(prev.map((x) => x.relativePath));
      const merged = [...prev];
      for (const item of next) {
        if (seen.has(item.relativePath)) continue;
        merged.push(item);
        seen.add(item.relativePath);
      }

      const pickedVideos = merged.filter((item) => isVideoFile(item.file));
      const pickedText = merged.filter((item) => isUploadDemoTextFile(item.file));
      const isVideoOnly =
        pickedVideos.length > 0 && pickedText.length === 0;

      if (isVideoOnly) {
        if (pickedVideos.length > 1) {
          handleApiError(
            new Error(
              "Upload demo video: chỉ được đính kèm đúng 1 file MP4/WebM/MOV.",
            ),
          );
          return [pickedVideos[pickedVideos.length - 1]!];
        }
        return pickedVideos;
      }

      if (pickedVideos.length > 1) {
        handleApiError(
          new Error(
            "HTML demo: tối đa 1 video tùy chọn. Đã giữ file video mới nhất.",
          ),
        );
        const keepVideoId = pickedVideos[pickedVideos.length - 1]!.id;
        return merged.filter(
          (item) => !isVideoFile(item.file) || item.id === keepVideoId,
        );
      }

      return merged;
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((x) => x.id !== id));
  };

  const openAttachmentPicker = async () => {
    try {
      const files = await pickUnifiedAttachments(attachmentInputRef.current);
      if (!files) return;
      await handlePickAttachments(files);
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : "Không chọn được file đính kèm.";
      handleApiError(new Error(reason));
    }
  };

  const handleChatDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = await collectFilesFromDataTransfer(e.dataTransfer);
    if (files.length === 0) return;
    const dt = new DataTransfer();
    files.forEach((file) => dt.items.add(file));
    await handlePickAttachments(dt.files);
  };

  const runVideoBuildDemoUpload = async (plan: {
    remotePath?: string | null;
    brand?: string | null;
    demoId?: string | null;
    demoValue?: string | null;
    overwrite?: boolean;
  }) => {
    const setProgress = (percent: number, label: string) => {
      setUploadProgress({
        percent: Math.max(0, Math.min(100, Math.round(percent))),
        label,
      });
    };

    setProgress(5, "Preparing video demo...");
    const videoItems = attachments.filter((item) => isVideoFile(item.file));
    if (videoItems.length !== 1) {
      throw new Error(
        "Video demo: upload exactly one MP4/WebM/MOV file (no HTML/JS or other assets).",
      );
    }
    const extraFiles = attachments.filter(
      (item) => !isVideoFile(item.file),
    );
    if (extraFiles.length > 0) {
      throw new Error(
        "Video demo: remove non-video attachments. Only one MP4/WebM/MOV is allowed.",
      );
    }

    const normalizedBrand = resolveAllowedBuildDemoBrand(
      String(plan.brand || "").trim(),
    );
    if (!normalizedBrand) {
      const hints = suggestBuildDemoBrands(
        String(plan.brand || "").trim(),
        allowedBuildDemoBrands,
      ).join(", ");
      throw new Error(
        `Brand không hợp lệ. Chỉ cho phép brand trong danh sách cấu hình. Gợi ý: ${hints}.`,
      );
    }
    assertBuildDemoBrandUserPermission(normalizedBrand, allowedBuildDemoBrands);
    const brandToken = normalizePathToken(normalizedBrand).replace(
      /^brand-+/,
      "",
    );

    const result = await uploadVideoDemo({
      sftpClient,
      videoFile: videoItems[0]!.file,
      brandToken,
      requestedRemotePath: String(plan.remotePath || "").trim(),
      autoResolvePath: !String(plan.remotePath || "").trim(),
      onProgress: setProgress,
    });

    return {
      ...result,
      formatSuggestions: [] as string[],
    };
  };

  const runBuildDemoUploadTool = async (plan: {
    remotePath?: string | null;
    brand?: string | null;
    demoId?: string | null;
    demoValue?: string | null;
    overwrite?: boolean;
  }) => {
    const uploadKind = detectUploadDemoKind(attachments);
    if (uploadKind === "video") {
      return runVideoBuildDemoUpload(plan);
    }

    const setProgress = (percent: number, label: string) => {
      setUploadProgress({
        percent: Math.max(0, Math.min(100, Math.round(percent))),
        label,
      });
    };

    setProgress(5, "Preparing build demo files...");
    if (attachments.length === 0) {
      throw new Error("No attached files found for upload.");
    }
    const logs: string[] = [];
    let uploaded = 0;
    const imageItems = attachments.filter((item) => isImageFile(item.file));
    const htmlItems = attachments.filter((item) => isHtmlFile(item.file));
    const jsItems = attachments.filter((item) => {
      const ext = (item.file.name.split(".").pop() ?? "").toLowerCase();
      return ext === "js";
    });
    const videoItems = attachments.filter((item) => isVideoFile(item.file));
    setProgress(15, "Analyzing attachments...");

    const imageBase64ByName = new Map<string, string>();
    for (const item of imageItems) {
      try {
        const compressed = await compressImageToDataUrl(item.file, 0.7);
        imageBase64ByName.set(item.file.name, compressed);
      } catch {
        const raw = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? ""));
          reader.onerror = () => reject(new Error("read failed"));
          reader.readAsDataURL(item.file);
        });
        imageBase64ByName.set(item.file.name, raw);
      }
      logs.push(`Embedded image: ${item.relativePath || item.file.name}`);
    }
    setProgress(35, "Converting image assets...");

    const selectedHtml = htmlItems[0] ?? null;
    const selectedJs = jsItems[0] ?? null;
    const selectedVideo = videoItems[0] ?? null;

    if (!selectedHtml || !selectedJs) {
      throw new Error(
        "Missing required files. Upload demo needs exactly: 1 HTML + 1 JS (base64). Video is optional.",
      );
    }
    setProgress(45, "Validating required files...");

    const requestedRemotePath = String(plan.remotePath || "").trim();
    const normalizedBrand = resolveAllowedBuildDemoBrand(String(plan.brand || "").trim());
    if (!normalizedBrand) {
      const hints = suggestBuildDemoBrands(
        String(plan.brand || "").trim(),
        allowedBuildDemoBrands,
      ).join(", ");
      throw new Error(
        `Brand không hợp lệ. Chỉ cho phép brand trong danh sách cấu hình. Gợi ý: ${hints}.`,
      );
    }
    assertBuildDemoBrandUserPermission(normalizedBrand, allowedBuildDemoBrands);
    const brandToken = normalizePathToken(normalizedBrand).replace(
      /^brand-+/,
      "",
    );
    if (!brandToken) {
      throw new Error(
        "Missing brand. Use `brand: <name>` (or include brand in `path:` like `YYYY/MM/<brand>/...`).",
      );
    }
    const inferredUploadToken = normalizePathToken(
      (selectedHtml.file.name || selectedJs.file.name || selectedVideo?.file.name || "upload").replace(
        /\.[^.]+$/,
        "",
      ),
    );
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    // This autonomous flow is the HTML BuildDemo pipeline (1 HTML + 1 JS, video optional).
    // So remote path segment must stay `html` even when a video file is attached.
    const demoFormatSeg = "html";
    let resolvedRemotePath =
      requestedRemotePath ||
      [year, month, brandToken, "all", demoFormatSeg, inferredUploadToken]
        .filter(Boolean)
        .join("/");
    if (!resolvedRemotePath) {
      throw new Error(
        "Missing target source path. Provide `path:` or `brand:` in your prompt.",
      );
    }
    setProgress(60, "Resolving remote path...");

    if (!requestedRemotePath) {
      const parts = resolvedRemotePath.split("/").filter(Boolean);
      const baseSeg = parts.pop() ?? inferredUploadToken;
      const prefix = parts;
      const MAX_TRIES = 500;
      for (let i = 0; i < MAX_TRIES; i++) {
        const seg = i === 0 ? baseSeg : `${baseSeg}-${i}`;
        const candidate = [...prefix, seg].join("/");
        const existsData = await sftpClient.exists(`/script/demo/${candidate}`, "demo");
        if (!(existsData?.ok && existsData.exists)) {
          resolvedRemotePath = candidate;
          break;
        }
      }
    }

    if (!plan.overwrite) {
      const parts = resolvedRemotePath.split("/").filter(Boolean);
      const baseSeg = parts.pop();
      if (baseSeg) {
        const prefix = parts;
        const MAX_TRIES = 500;
        for (let i = 0; i < MAX_TRIES; i++) {
          const seg = i === 0 ? baseSeg : `${baseSeg}-${i}`;
          const candidate = [...prefix, seg].join("/");
          const existsData = await sftpClient.exists(`/script/demo/${candidate}`, "demo");
          if (!(existsData?.ok && existsData.exists)) {
            resolvedRemotePath = candidate;
            break;
          }
        }
      }
    }

    const remoteBase = `/script/demo/${resolvedRemotePath}`
      .replace(/\/{2,}/g, "/")
      .replace(/\/+$/, "");
    const sftpRemoteLeaf = resolvedRemotePath.split("/").filter(Boolean).pop() ?? "";
    const sftpUploadBaseForStrip = inferUploadBaseToken(
      [selectedHtml, selectedJs, selectedVideo].filter(
        (item): item is ChatAttachment => Boolean(item),
      ),
    );

    const uploadTextItems = [selectedHtml, selectedJs];
    const totalUploadItems = uploadTextItems.length + (selectedVideo ? 1 : 0);
    let uploadedItems = 0;
    for (const item of uploadTextItems) {
      const rel = stripRedundantRelativeFolderPrefix(
        toPosixPath(item.relativePath || item.file.name),
        { remoteLeaf: sftpRemoteLeaf, uploadBaseToken: sftpUploadBaseForStrip },
      );
      const segments = rel.split("/").filter(Boolean);
      const remoteDir = segments.slice(0, -1).join("/");
      const fileName = segments[segments.length - 1] || item.file.name;
      const finalName = isHtmlFile(item.file) ? "index.html" : fileName;
      const remoteFilePath =
        `${remoteBase}/${remoteDir ? `${remoteDir}/` : ""}${finalName}`.replace(
          /\/{2,}/g,
          "/",
        );
      const converted = await convertTextFileWithBase64Images(
        item.file,
        imageBase64ByName,
      );
      const res = await sftpClient.write({
        path: remoteFilePath,
        content: converted,
      });
      if (!res?.ok) throw new Error(res?.error || `Upload failed: ${rel}`);
      uploaded++;
      uploadedItems++;
      setProgress(
        60 + Math.round((uploadedItems / Math.max(1, totalUploadItems)) * 25),
        "Uploading converted files...",
      );
      logs.push(`Uploaded text: ${remoteFilePath}`);
    }

    if (selectedVideo) {
      const rel = stripRedundantRelativeFolderPrefix(
        toPosixPath(selectedVideo.relativePath || selectedVideo.file.name),
        { remoteLeaf: sftpRemoteLeaf, uploadBaseToken: sftpUploadBaseForStrip },
      );
      const remoteFilePath = `${remoteBase}/${rel}`.replace(/\/{2,}/g, "/");
      const res = await sftpClient.writeBinary(
        remoteFilePath,
        await selectedVideo.file.arrayBuffer(),
      );
      if (!res?.ok) throw new Error(res?.error || `Upload failed: ${rel}`);
      uploaded++;
      uploadedItems++;
      setProgress(
        60 + Math.round((uploadedItems / Math.max(1, totalUploadItems)) * 25),
        "Uploading media file...",
      );
      logs.push(`Uploaded video: ${remoteFilePath}`);
    }

    // Skip everything except selected 1 HTML + 1 JS + optional 1 video.
    const selectedIds = new Set(
      [selectedHtml.id, selectedJs.id, selectedVideo?.id].filter(Boolean),
    );
    for (const item of attachments) {
      if (selectedIds.has(item.id) || isImageFile(item.file)) {
        continue;
      }
      logs.push(
        `Skipped unsupported file: ${item.relativePath || item.file.name}`,
      );
    }

    if (uploaded === 0) {
      throw new Error(
        "No uploadable files found. Only .html/.htm, .js, and video files are uploaded.",
      );
    }
    setProgress(92, "Generating preview URL...");

    const previewFormat = await resolveFormatForPreview({
      remotePath: resolvedRemotePath,
      demoId: plan.demoId,
      demoValue: plan.demoValue,
    });
    const previewUrl = await getYomediaDemoPreviewUrl({
      remotePath: resolvedRemotePath,
      serverApiUrl: serverApiOrigin(),
      ...(previewFormat.formatValue
        ? { formatValue: previewFormat.formatValue }
        : {}),
    });
    setProgress(100, "Build demo upload completed.");

    return {
      remoteBase,
      remotePath: resolvedRemotePath,
      uploaded,
      logs,
      previewUrl,
      formatValue: previewFormat.formatValue,
      formatSuggestions: previewFormat.suggestions,
    };
  };

  const executeUploadDemoPlan = async (plan: PendingUploadDemoAction) => {
    setUploadProgress({
      percent: 1,
      label: "Starting build demo pipeline...",
    });
    try {
      const uploadKind = plan.uploadKind ?? detectUploadDemoKind(attachments);
      if (uploadKind === "html") {
        const inferredRemotePath = inferUploadRemotePathFromAttachments(
          plan,
          attachments,
        );
        const formatValidation = await validateUploadDemoFormat({
          remotePath: inferredRemotePath,
          demoId: plan.demoId,
          demoValue: plan.demoValue,
        });
        if (formatValidation.ok === false) {
          const pathSize = extractSizeTokenFromRemotePath(inferredRemotePath);
          const mismatchMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "model",
            content: buildFormatMismatchMessage({
              userInput: formatValidation.userInput,
              pathSize,
              reason: formatValidation.reason,
              options: formatValidation.options,
            }),
          };
          setMessages((prev) => [...prev, mismatchMsg]);
          setPendingUploadAction({
            ...plan,
            uploadKind,
            demoValue: null,
            pendingFormatReselect: true,
            pendingFormatOptions: formatValidation.options,
            requiredInputs: Array.from(
              new Set([...(plan.requiredInputs ?? []), "format"]),
            ),
          });
          return true;
        }
        plan = {
          ...plan,
          demoValue: formatValidation.formatValue,
        };
      }

      const runResult = await runBuildDemoUploadTool(plan);
      const isVideoUpload = uploadKind === "video";
      const normalizedBrand =
        resolveAllowedBuildDemoBrand(String(plan.brand ?? "").trim()) ?? null;
      rememberLastUploadedDemo({
        remoteBase: runResult.remoteBase,
        remotePath: runResult.remotePath,
        brand: normalizedBrand,
        uploadKind,
        uploadedAt: Date.now(),
      });
      const videoPreviewLines =
        isVideoUpload &&
        "videoPreviews" in runResult &&
        Array.isArray(
          (runResult as { videoPreviews?: VideoPreviewLink[] }).videoPreviews,
        )
          ? (
              (runResult as { videoPreviews: VideoPreviewLink[] }).videoPreviews
            ).flatMap((item) => [
              `**${item.label}**`,
              item.previewUrl
                ? `Preview: ${item.previewUrl}`
                : `Preview: could not generate URL (${item.formatValue})`,
            ])
          : [];

      const okMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: [
          isVideoUpload
            ? "Video demo upload completed (tvc.mp4 + make-vast.xml)."
            : "BuildDemo upload completed.",
          `Remote: ${runResult.remoteBase}`,
          `Uploaded files: ${runResult.uploaded}`,
          isVideoUpload && videoPreviewLines.length > 0
            ? null
            : runResult.formatValue
              ? `Format: ${runResult.formatValue}`
              : null,
          ...(isVideoUpload ? videoPreviewLines : []),
          !isVideoUpload
            ? runResult.previewUrl
              ? `Preview: ${runResult.previewUrl}`
              : `Preview: could not generate URL for ${runResult.remotePath}`
            : null,
          !isVideoUpload &&
          !runResult.formatValue &&
          runResult.formatSuggestions?.length
            ? `Suggestions: ${runResult.formatSuggestions.join(", ")}`
            : null,
          isAdminUser
            ? `Gõ \`xóa demo\` để xóa folder vừa upload (\`${runResult.remoteBase}\`).`
            : null,
        ]
          .filter((line): line is string => Boolean(line))
          .join("\n"),
      };
      setMessages((prev) => [...prev, okMsg]);
      setAttachments([]);
      setPendingUploadAction(null);
      return true;
    } catch (toolErr) {
      const msg =
        toolErr instanceof Error
          ? toolErr.message
          : "BuildDemo upload tool failed.";
      const failMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: `Upload demo tool failed: ${msg}`,
      };
      setMessages((prev) => [...prev, failMsg]);
      return true;
    } finally {
      setUploadProgress(null);
    }
  };

  const executeDeleteUploadedDemo = async (options?: {
    remotePath?: string | null;
  }): Promise<boolean> => {
    if (!isAdminUser) {
      const deniedMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content:
          "Chỉ **administrator** mới có quyền xóa folder demo trên SFTP. Liên hệ admin nếu cần xóa demo vừa upload.",
      };
      setMessages((prev) => [...prev, deniedMsg]);
      return true;
    }

    const explicitPath = String(options?.remotePath ?? "").trim();
    let remoteBase = "";
    let remotePath = "";
    let brand: string | null = null;

    if (explicitPath) {
      const normalized = normalizeDemoRemoteTarget(explicitPath);
      remoteBase = normalized.remoteBase;
      remotePath = normalized.remotePath;
      brand = extractBrandFromDemoRemotePath(remoteBase);
    } else if (lastUploadedDemo) {
      remoteBase = lastUploadedDemo.remoteBase;
      remotePath = lastUploadedDemo.remotePath;
      brand = lastUploadedDemo.brand;
    }

    if (!remoteBase) {
      const noTargetMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content:
          "Không có demo nào được ghi nhớ trong session chat. Upload demo trước, hoặc chỉ định path: `path: /script/demo/2026/05/brand/all/video-1`.",
      };
      setMessages((prev) => [...prev, noTargetMsg]);
      return true;
    }

    if (brand) {
      const denied = checkBuildDemoBrandUserPermission(
        brand,
        allowedBuildDemoBrands,
      );
      if (denied) {
        const deniedMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "model",
          content: denied,
        };
        setMessages((prev) => [...prev, deniedMsg]);
        return true;
      }
    }

    try {
      const res = await sftpClient.remove(remoteBase, { scope: "demo" });
      if (res.ok === false) {
        throw new Error(res.error || "SFTP delete failed.");
      }

      if (lastUploadedDemo?.remoteBase === remoteBase) {
        clearLastUploadedDemo();
      }

      const okMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: [
          "Đã xóa folder demo trên SFTP.",
          `Remote: ${remoteBase}`,
          brand ? `Brand: ${brand}` : null,
        ]
          .filter((line): line is string => Boolean(line))
          .join("\n"),
      };
      setMessages((prev) => [...prev, okMsg]);
      void recordActivity({
        user,
        action: "delete_demo_success",
        area: "AI Chat",
        description: "Deleted demo folder from chat session",
        target: remotePath || remoteBase,
        metadata: {
          remoteBase,
          brand: brand ?? "",
        },
      });
      return true;
    } catch (deleteErr) {
      const msg =
        deleteErr instanceof Error
          ? deleteErr.message
          : "Delete demo folder failed.";
      const failMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: `Xóa demo thất bại: ${msg}`,
      };
      setMessages((prev) => [...prev, failMsg]);
      return true;
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const trimmedInput = input.trim();

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: trimmedInput,
    };

    setMessages((prev) => [...prev, userMsg]);

    if (
      detectDeleteDemoIntent(trimmedInput) &&
      !isDeleteDemoHelpQuestion(trimmedInput)
    ) {
      setIsLoading(true);
      setInput("");
      try {
        await executeDeleteUploadedDemo({
          remotePath:
            extractDeleteDemoPathFromInput(trimmedInput) ??
            undefined,
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (pendingUploadAction?.tool === "build_demo_convert_upload") {
      const requestedBrand = extractBrandFromInput(trimmedInput);
      if (requestedBrand) {
        const normalizedBrand = resolveAllowedBuildDemoBrand(requestedBrand);
        if (!normalizedBrand) {
          const suggestions = suggestBuildDemoBrands(
            requestedBrand,
            allowedBuildDemoBrands,
          );
          const invalidBrandMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "model",
            content: `Brand \`${requestedBrand}\` không có trong danh sách. Vui lòng nhập lại brand hợp lệ${
              suggestions.length > 0 ? ` (gợi ý: ${suggestions.join(", ")})` : ""
            }.`,
          };
          setMessages((prev) => [...prev, invalidBrandMsg]);
          setInput("");
          return;
        }
        const brandPermissionDenied = checkBuildDemoBrandUserPermission(
          normalizedBrand,
          allowedBuildDemoBrands,
        );
        if (brandPermissionDenied) {
          const uploadKind = detectUploadDemoKind(attachments);
          const nextPending = withBrandRequirement(
            pendingUploadAction,
            allowedBuildDemoBrands,
          );
          setPendingUploadAction({ ...nextPending, uploadKind });
          const deniedMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "model",
            content: [
              brandPermissionDenied,
              "",
              buildBrandSelectionMessage(nextPending.pendingBrandOptions ?? []),
            ].join("\n"),
          };
          setMessages((prev) => [...prev, deniedMsg]);
          setInput("");
          return;
        }
      }

      const updates = extractPendingUploadSupplements(
        trimmedInput,
        pendingUploadAction,
        allowedBuildDemoBrands,
      );
      const hasUpdate = Object.keys(updates).length > 0;
      const mergedAction: PendingUploadDemoAction = {
        ...pendingUploadAction,
        ...updates,
      };
      const uploadKind = detectUploadDemoKind(attachments);
      const remaining = computePendingUploadMissingInputs(
        { ...mergedAction, uploadKind },
        attachments.length,
        uploadKind,
        allowedBuildDemoBrands,
      );
      const canContinue = remaining.length === 0;
      const brandPermissionBlocker = tryGetUploadDemoBrandPermissionError(
        mergedAction,
        allowedBuildDemoBrands,
      );

      if (brandPermissionBlocker) {
        const nextPending = withBrandRequirement(
          mergedAction,
          allowedBuildDemoBrands,
        );
        setPendingUploadAction({ ...nextPending, uploadKind });
        const deniedMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "model",
          content: [
            brandPermissionBlocker,
            "",
            buildBrandSelectionMessage(nextPending.pendingBrandOptions ?? []),
          ].join("\n"),
        };
        setMessages((prev) => [...prev, deniedMsg]);
        setInput("");
        return;
      }

      if (hasUpdate && !canContinue) {
        setPendingUploadAction(
          applyPendingBrandOptionsIfNeeded(
            {
              ...mergedAction,
              uploadKind,
              requiredInputs: remaining,
            },
            remaining,
            allowedBuildDemoBrands,
          ),
        );
        const promptMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "model",
          content: `Đã lưu thông tin bổ sung. ${buildMissingUploadInputsMessage(mergedAction, remaining, allowedBuildDemoBrands)}`,
        };
        setMessages((prev) => [...prev, promptMsg]);
        setInput("");
        return;
      }

      if (!hasUpdate) {
        const pendingBrandOptions = pendingUploadAction.pendingBrandOptions;
        const brandOptionIndex = extractFormatOptionIndexFromInput(trimmedInput);
        if (
          brandOptionIndex != null &&
          pendingBrandOptions?.length &&
          brandOptionIndex > pendingBrandOptions.length
        ) {
          const invalidBrandOptionMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "model",
            content: `Số \`${brandOptionIndex}\` không hợp lệ. Vui lòng chọn brand từ 1 đến ${pendingBrandOptions.length}.`,
          };
          setMessages((prev) => [...prev, invalidBrandOptionMsg]);
          setInput("");
          return;
        }

        const brandInputDenied = tryGetBrandInputPermissionError(
          trimmedInput,
          pendingUploadAction,
          allowedBuildDemoBrands,
        );
        if (brandInputDenied) {
          const nextPending = withBrandRequirement(
            pendingUploadAction,
            allowedBuildDemoBrands,
          );
          setPendingUploadAction({ ...nextPending, uploadKind });
          const deniedMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "model",
            content: [
              brandInputDenied,
              "",
              buildBrandSelectionMessage(nextPending.pendingBrandOptions ?? []),
            ].join("\n"),
          };
          setMessages((prev) => [...prev, deniedMsg]);
          setInput("");
          return;
        }

        const pendingOptions = pendingUploadAction.pendingFormatOptions;
        const optionIndex = extractFormatOptionIndexFromInput(trimmedInput);
        if (
          optionIndex != null &&
          pendingOptions?.length &&
          optionIndex > pendingOptions.length
        ) {
          const invalidOptionMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "model",
            content: `Số \`${optionIndex}\` không hợp lệ. Vui lòng chọn từ 1 đến ${pendingOptions.length}.`,
          };
          setMessages((prev) => [...prev, invalidOptionMsg]);
          setInput("");
          return;
        }

        const reminderMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "model",
          content:
            pendingUploadAction.pendingFormatReselect &&
            pendingOptions &&
            pendingOptions.length > 0
              ? `Chọn format bằng cách gõ số 1–${pendingOptions.length} từ danh sách trên, hoặc \`format: ${pendingOptions[0]?.value ?? "mobile-masthead"}\`.`
              : (pendingUploadAction.requiredInputs ?? []).includes("brand") &&
                  pendingBrandOptions &&
                  pendingBrandOptions.length > 0
                ? `Chọn brand bằng cách gõ số 1–${pendingBrandOptions.length} từ danh sách trên, hoặc \`brand: ${pendingBrandOptions[0]?.id ?? "yomedia"}\`.`
                : uploadKind === "video"
                  ? "Mình đang chờ thông tin để upload video demo. Ví dụ: `brand: yomedia` + đính kèm đúng 1 file MP4/WebM/MOV (sau upload sẽ có preview outstream + instream)."
                  : allowedBuildDemoBrands && allowedBuildDemoBrands.length > 0
                    ? `Mình đang chờ thông tin còn thiếu để tiếp tục upload demo. Brand được phép: ${allowedBuildDemoBrands.join(", ")}.`
                    : "Mình đang chờ thông tin còn thiếu để tiếp tục upload demo. Ví dụ: `brand: yomedia`, `format: 300x250`.",
        };
        setMessages((prev) => [...prev, reminderMsg]);
        setInput("");
        return;
      }

      setInput("");
      setIsLoading(true);
      try {
        await executeUploadDemoPlan({
          ...mergedAction,
          uploadKind,
          requiredInputs: remaining,
        });
        return;
      } finally {
        setIsLoading(false);
      }
    }

    // URL with b=...index.html → extract path for user, skip AI request.
    try {
      const decoded = decodeURIComponent(trimmedInput);
      const match = decoded.match(/b=([^&]*?)index\.html/);
      if (match && match[1]) {
        const extractedRaw = match[1]; // e.g. 2026/03/romano/384x683/
        const displayDir = extractedRaw
          .replace(/index\.html$/i, "")
          .replace(/^\/+/, "")
          .replace(/\/+$/, "");

        const sftpDir = `/${displayDir}/`.replace(/\/{2,}/g, "/");

        const baseUrl = serverApiOrigin();

        let exists: boolean | null = null;
        let message: string | null = null;
        try {
          const data = await fetchJsonOrThrow<
            | { ok: true; exists: boolean; message?: string | null }
            | { ok: false; error?: string }
          >(`${baseUrl}/api/sftp/exists?path=${encodeURIComponent(sftpDir)}`);
          if (data.ok) {
            exists = data.exists;
            message = "message" in data ? (data.message ?? null) : null;
          } else {
            throw new Error(
              "error" in data && data.error
                ? data.error
                : "Failed to check SFTP directory",
            );
          }
        } catch (e) {
          handleApiError(e, "SFTP Exists");
        }

        const content =
          exists === null
            ? `Directory: ${displayDir}\nCould not verify SFTP (network/server error).`
            : exists
              ? `Directory: ${displayDir}\nSFTP: EXISTS.\n${message || ""}`.trim()
              : `Directory: ${displayDir}\nSFTP: NOT FOUND.`;

        const extractedMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "model",
          content,
        };
        setMessages((prev) => [...prev, extractedMsg]);
        void recordActivity({
          user,
          action: "chat_check_sftp_path",
          area: "AI Chat",
          description: "Checked SFTP path from chat input",
          target: displayDir,
          metadata: {
            inputPreview: summarizePrompt(trimmedInput),
            sftpDirectory: sftpDir,
            exists,
          },
        });
        setInput("");
        return;
      }
    } catch (err) {
      console.error("Failed to decode URL from input", err);
    }

    const demoPath = tryExtractDemoRemotePath(trimmedInput);
    if (demoPath) {
      setInput("");
      setIsLoading(true);
      const serverApiUrl = serverApiOrigin();
      try {
        const url = await getYomediaDemoPreviewUrl({
          remotePath: demoPath,
          serverApiUrl,
        });
        const content = url
          ? `Demo preview link:\n\n${url}`
          : "Could not build demo preview link. Check the path.";
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "model",
            content,
          },
        ]);
        void recordActivity({
          user,
          action: "chat_generate_demo_link",
          area: "AI Chat",
          description: "Generated demo preview link from chat input",
          target: demoPath,
          metadata: {
            inputPreview: summarizePrompt(trimmedInput),
            previewUrl: url,
          },
        });
      } catch (err) {
        handleApiError(err, "Demo preview link");
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "model",
            content:
              "Could not build demo preview link. Retry or check the server connection.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setInput("");
    setIsLoading(true);

    try {
      const data = await api.rag.query(
        trimmedInput,
        aiProvider,
        attachments.map((item) => ({
          name: item.file.name,
          relativePath: item.relativePath,
          size: item.file.size,
          mimeType: item.file.type || guessMimeFromName(item.file.name),
        })),
      );

      const action = (
        data as {
          action?: {
            tool?: string;
            remotePath?: string | null;
            brand?: string | null;
            demoId?: string | null;
            demoValue?: string | null;
            overwrite?: boolean;
            requiredInputs?: string[];
          };
        }
      ).action;
      if (action?.tool === "delete_uploaded_demo") {
        const deleteAction = action as DeleteUploadedDemoAction;
        await executeDeleteUploadedDemo({
          remotePath: deleteAction.remotePath,
        });
        setIsLoading(false);
        return;
      }
      if (action?.tool === "build_demo_convert_upload") {
        const nextPending = action as PendingUploadDemoAction;
        const uploadKind =
          nextPending.uploadKind ?? detectUploadDemoKind(attachments);
        const rawBrand = String(nextPending.brand ?? "").trim();
        const mergedPending = {
          ...nextPending,
          uploadKind,
          brand: rawBrand
            ? resolveAllowedBuildDemoBrand(rawBrand) ?? nextPending.brand
            : nextPending.brand,
        };
        const missing = computePendingUploadMissingInputs(
          mergedPending,
          attachments.length,
          uploadKind,
          allowedBuildDemoBrands,
        );
        const brandPermissionBlocker = tryGetUploadDemoBrandPermissionError(
          mergedPending,
          allowedBuildDemoBrands,
        );
        if (brandPermissionBlocker) {
          const nextPending = withBrandRequirement(
            mergedPending,
            allowedBuildDemoBrands,
          );
          setPendingUploadAction(nextPending);
          const deniedMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "model",
            content: [
              brandPermissionBlocker,
              "",
              buildBrandSelectionMessage(nextPending.pendingBrandOptions ?? []),
            ].join("\n"),
          };
          setMessages((prev) => [...prev, deniedMsg]);
          setIsLoading(false);
          return;
        }
        if (missing.length > 0) {
          setPendingUploadAction(
            applyPendingBrandOptionsIfNeeded(
              {
                ...mergedPending,
                requiredInputs: missing,
              },
              missing,
              allowedBuildDemoBrands,
            ),
          );
          const missingMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "model",
            content: buildMissingUploadInputsMessage(
              mergedPending,
              missing,
              allowedBuildDemoBrands,
            ),
          };
          setMessages((prev) => [...prev, missingMsg]);
          setIsLoading(false);
          return;
        }
        setPendingUploadAction(null);
        await executeUploadDemoPlan(mergedPending);
        setIsLoading(false);
        return;
      }

      const modelMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: "model",
        content: data.answer || "Sorry, I could not generate a response.",
      };
      setMessages((prev) => [...prev, modelMsg]);
      void recordActivity({
        user,
        action: "chat_prompt",
        area: "AI Chat",
        description: "Sent AI chat prompt",
        target: summarizePrompt(trimmedInput),
        metadata: {
          inputPreview: summarizePrompt(trimmedInput),
          responseLength: String(data.answer || "").length,
          aiProvider,
        },
      });
    } catch (err) {
      handleApiError(err, "Chat Message");
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "I encountered an error processing your request.";
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: "model",
          content: msg,
        } as ChatMessage,
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-6rem)] flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl transition-colors duration-300">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-3 h-3 shrink-0 bg-green-500 rounded-full animate-pulse"></div>
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 dark:text-white truncate">
              NovaAi · {chatProviderLabel(aiProvider)}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {
                CHAT_AI_PROVIDER_OPTIONS.find((o) => o.id === aiProvider)
                  ?.description
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="chat-ai-provider" className="sr-only">
            AI provider
          </label>
          <select
            id="chat-ai-provider"
            value={aiProvider}
            onChange={(e) =>
              handleProviderChange(e.target.value as ChatAiProvider)
            }
            disabled={isLoading}
            className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
          >
            {CHAT_AI_PROVIDER_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button
            onClick={() => {
              if (messages.length > 0) {
                void recordActivity({
                  user,
                  action: "chat_clear_history",
                  area: "AI Chat",
                  description: "Cleared chat conversation",
                  target: "conversation",
                  metadata: { clearedMessages: messages.length },
                });
              }
              setMessages([]);
            }}
            className="text-xs text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-slate-100 transition-colors"
          >
            Clear History
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-slate-50 dark:bg-transparent"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40 text-slate-500 dark:text-slate-100">
            <ChatBubbleBottomCenterTextIcon className="w-16 h-16 mb-4" />
            <p className="text-xl font-medium">
              Start a conversation with NovaAi
            </p>
            <p className="text-sm">
              Hỏi tài liệu nội bộ, hoặc gõ{" "}
              <code className="text-xs px-1 rounded bg-slate-200 dark:bg-slate-800">
                web - câu hỏi
              </code>{" "}
              để tìm trên internet.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] p-4 rounded-2xl ${
                m.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-none shadow-indigo-200 dark:shadow-none"
                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700 shadow-sm"
              }`}
            >
              <div className="text-sm leading-relaxed">
                {renderColoredContent(m.content)}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 shadow-sm">
              {uploadProgress ? (
                <div className="w-72 space-y-2">
                  <div className="text-xs text-slate-700 dark:text-slate-200">
                    {uploadProgress.label}
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress.percent}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {uploadProgress.percent}%
                  </div>
                </div>
              ) : (
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-400 dark:bg-slate-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSend}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          void handleChatDrop(e);
        }}
        className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      >
        <input
          ref={attachmentInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={async (e) => {
            const inputEl = e.currentTarget;
            await handlePickAttachments(e.target.files);
            inputEl.value = "";
          }}
        />
        {attachments.length > 0 && (
          <div className="mb-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-2 space-y-1 max-h-28 overflow-auto">
            {attachments.map((item) => (
              <div
                key={item.id}
                className="text-xs flex items-center justify-between gap-2 text-slate-700 dark:text-slate-200"
              >
                <span className="font-mono truncate">{item.relativePath}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(item.id)}
                  className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-rose-200 dark:hover:bg-rose-800/40"
                >
                  remove
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/70 p-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Hỏi tài liệu, "upload demo brand: yomedia format: instream" + 1 video, hoặc HTML/JS folder'
            className="flex-1 min-w-0 h-11 bg-transparent border-none rounded-xl px-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-0"
          />
          <Button
            type="button"
            onClick={() => {
              void openAttachmentPicker();
            }}
            title="Đính kèm file, zip hoặc folder demo (tự nhận diện)"
            className="shrink-0 h-10 px-3 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors text-xs font-semibold"
          >
            {attachments.length > 0
              ? `Attachment (${attachments.length})`
              : "Attachment"}
          </Button>
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="shrink-0 h-10 w-10 flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-indigo-500/20"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </Button>
        </div>
      </form>
    </div>
  );
};

const ChatBubbleBottomCenterTextIcon = ({
  className,
}: {
  className?: string;
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
    />
  </svg>
);

export default ChatView;
