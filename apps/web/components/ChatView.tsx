import React, { useState, useRef, useEffect } from "react";
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

const S_ON_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAA2CAMAAAClUqpcAAAAP1BMVEX///8AAAD////////////////////////////////////////////////////////////////////////////NY5A9AAAAFHRSTlMzACXMChfymT9mWbJMv3+McuXYpbWoq14AAAHlSURBVEjHvZaJjoMwDES9gYSE+5j//9alpsaUhk1opbVUIIWn8Tgn/cSitEbC2jL6CcUgOoWxZRK0FA9zRimJKXoJlheIonHQUDLKM6hyKVEFlcsKewYN3SRJuXsk5XLe7xVS0FI65u61QJRZmAZoXkjKNNgDGI7J0pXg2PujPybrgyTFBX0HVNKo3cPfAhQHSYoKBgf9zLvN3wT0KkkRQb8AO6j+AjDvkiv4xtUzDmC7/oa1td4LYNxHAb1lWgECsr+BGGlYsttzJSv5hUcQERTcjbUsuTYcPeOHNoujA8cJZH3Xcv8PXNiwcXuiCy5A6vih5mvQPrJqLA5Klo6zPJhMgZJlAbDjOR/sWaYCiPF8MPDTf4Ljp+DCfdDxu/kOOAGjDBr5M9WPMnS4Nwu+NgI+NfsYKC8qxgduDDLkRLMpOM5gWO+z57ncslFZPc7T6gyODq7mAjX0wCepTWQiD+5lPjb1im9TpDqM8djS0XYHkGHHheV8xWJ8sQqTgML1JPlymKvl0VfQGeRnDFudnBfB6wW5LRBIyFHyFcE/twApvOa7kAqmNx3lGmnYG9ucn5UztzZWv3NUfruVc5SfHB5uaZbvJyubxyl4gzRXh0CTY+/7Y+f3B11NOI0peH0sN/HT/C/3pivwmDak6QAAAABJRU5ErkJggg==";
const S_OFF_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAA2CAMAAAClUqpcAAAAP1BMVEX///8AAAD////////////////////////////////////////////////////////////////////////////NY5A9AAAAFHRSTlMzAJkmGWYOsj8H8thZf+W/jHJMzPy/nOYAAAFuSURBVEjHrdZZkoMwDATQJhIGk7CO7n/WgTKgYrxhMv2TBR4CF7aFKhTDTHuYTfAUH1om/AmxzUJGOGQ8mGNKo9AgHbJhyMjGBqDFnbBCdSVSIaFQQl2ZRHhc8iOEYgc6oUVZ+ICEwhgHDUJppzp5s4gUrAeRJVUSwYLtS9a8UiURKjgPkoawK/TLjSI5yBWM93SdXGEPveZ83iv4BFsW4CUKXf3mdG85rlKB3F8/+7ke3A40pxOp93E9ykkMfrpDfga9BjgNVernLajHmqsD3YDo3U91eahSXQF0QytdWwwb9/vdFkB1TpbASUdVJedhv4/LVfJecwlD5/TNUWmOmmMMNtd3tfu479608iCay+yYz2lVPZqPvEIOLzj5pcPAyzJmIEWXx3obwSkKTWJBnrp3vGByC6jbeMGnm86X21yxtA+3cvN186CyoJ7Cm89pn7VkFGkCLaUdP2w77f82uhpDPsu01mpZMSjczf8CCMYlsaG5I9IAAAAASUVORK5CYII=";
const BTN_REPLAY_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAMAAAC7IEhfAAAAM1BMVEUAAAD///////////////////////////////////////////////////////////////+3leKCAAAAEHRSTlMAf+8/Dx8vv49vX9+fT6/P7uaPeAAAANZJREFUOMvtkd0SxBAMRiOon6rm/Z92TadEo2bc7MXO7LkThy8BfhebXDRr6oGU1lS7Ex5L5oZEatmMMkdfBHXR+qTBNCcxZys7IrRDTMNxtayyCA8sdhPsZbk9s5HFwOV8LxlFjO7KrRPOYIw4/5iFOoDxUjyIcTJo1mLmsqWpGBOprjwXNaQo3sy9Prcq289RyPeiriJuQ4yGHqzmXk3r7wJMfga9NiVf1aMHyL8e4VFklyNoQBJevQ1G/OglC29EFNcpmGB8r3XXjdjg8LJytPDnC3wA/ZYX0JaBReoAAAAASUVORK5CYII=";
const BTN_PLAY_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEMAAABOCAMAAABMilufAAAAVFBMVEUAAAD///////////////////////////////////////////////////////////////////////////////////////////////////////////8wXzyWAAAAG3RSTlMADPUc33ftqifPtpVRQuZrODHVx7+djIRiWRRgp4d+AAABBklEQVRYw6TQyRWCQAAEUQYERxBZ3O3887QvvA6gKoB/qGasDU6aCjc0LNhw+4wNh7bo6FWogbZI6TJjw50rMbKFG7p9iJEtwMiWjhtq3wUY2QKMbFmJkS3EyBZquNMXG+6+EiNbuKG2L8DIFmBky4YN9+yIkS3Y8JYrNtxjI0a2ACNbiJEtxMgWbLjpxw0NPTeULSKNFRrZItiw2MDt/2bM5AagEASiEcMSDvjN96D9N2oRHmYa4EBglkcxw5Rgpxn4GzMl+Lk18RokSqDJa+I9SrThPfv/8BlGtOEz3Xu2rEOQtb3ju0dtgi7mHd9NaxN0dQ88u7BBwHIy8GzLBgHry3fmeAH5pBXvjExH/QAAAABJRU5ErkJggg==";
const BG_VIDEOS_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAeAAAAEOAQMAAABrVFYkAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAACZJREFUeNrtwQENAAAAwiD7p7bHBwwAAAAAAAAAAAAAAAAAAACIOkBWAAFeWY6hAAAAAElFTkSuQmCC";
const BUNDLED_DEMO_ASSET_IMAGE_BASENAMES = new Set(
  [
    "s_on copy.png",
    "s_off copy.png",
    "preplaytvc0001.png",
    "playbtn0001.png",
    "htt.png",
  ].map((s) => s.toLowerCase()),
);
const DEMO_MANIFEST_JQUERY_SRC =
  "https://media.yomedia.vn/createjs/jquery-2022.min.js?1726036079413";
const DEMO_MANIFEST_ANWIDGET_SRC =
  "https://demo.yomedia.vn/yomedia/components/sdk/anwidget.js?1726036079413";
const DEMO_MANIFEST_VIDEO_JS_SRC =
  "https://demo.yomedia.vn/yomedia/components/video/src/video.js?1726036079413";
const DEMO_MANIFEST_UI_IMAGE_JS_SRC =
  "https://demo.yomedia.vn/yomedia/components/ui/src/image.js?1726036079413";

function isBundledDemoAssetImageName(name: string): boolean {
  const leaf = (name.split(/[/\\]/).pop() ?? name).trim().toLowerCase();
  return BUNDLED_DEMO_ASSET_IMAGE_BASENAMES.has(leaf);
}

function replaceBundledDemoStaticImages(content: string): string {
  let c = content;
  for (const [from, to] of [
    [
      `"id": "s_on", "src": "images/s_on%20copy.png"`,
      `"id": "s_on",\n            "src": "${S_ON_DATA_URL}"`,
    ],
    [
      `"id": "s_on", "src":"images/s_on%20copy.png"`,
      `"id": "s_on",\n            "src": "${S_ON_DATA_URL}"`,
    ],
    [
      `"id": "s_on", "src": "images/s_on copy.png"`,
      `"id": "s_on",\n            "src": "${S_ON_DATA_URL}"`,
    ],
    [
      `"id": "s_on", "src":"images/s_on copy.png"`,
      `"id": "s_on",\n            "src": "${S_ON_DATA_URL}"`,
    ],
    [
      `"id": "s_off", "src": "images/s_off%20copy.png"`,
      `"id": "s_off",\n            "src": "${S_OFF_DATA_URL}"`,
    ],
    [
      `"id": "s_off", "src":"images/s_off%20copy.png"`,
      `"id": "s_off",\n            "src": "${S_OFF_DATA_URL}"`,
    ],
    [
      `"id": "s_off", "src": "images/s_off copy.png"`,
      `"id": "s_off",\n            "src": "${S_OFF_DATA_URL}"`,
    ],
    [
      `"id": "s_off", "src":"images/s_off copy.png"`,
      `"id": "s_off",\n            "src": "${S_OFF_DATA_URL}"`,
    ],
    [
      `"id": "btn_replay", "src": "images/preplaytvc0001.png"`,
      `"id": "btn_replay",\n            "src": "${BTN_REPLAY_DATA_URL}"`,
    ],
    [
      `"id": "btn_replay", "src":"images/preplaytvc0001.png"`,
      `"id": "btn_replay",\n            "src": "${BTN_REPLAY_DATA_URL}"`,
    ],
    [
      `"id": "btn_play", "src": "images/playBtn0001.png"`,
      `"id": "btn_play",\n            "src": "${BTN_PLAY_DATA_URL}"`,
    ],
    [
      `"id": "btn_play", "src":"images/playBtn0001.png"`,
      `"id": "btn_play",\n            "src": "${BTN_PLAY_DATA_URL}"`,
    ],
    [
      `"id": "bg_videos", "src": "images/htt.png"`,
      `"id": "bg_videos",\n            "src": "${BG_VIDEOS_DATA_URL}"`,
    ],
    [
      `"id": "bg_videos", "src":"images/htt.png"`,
      `"id": "bg_videos",\n            "src": "${BG_VIDEOS_DATA_URL}"`,
    ],
  ] as const) {
    c = c.replaceAll(from, to);
  }
  c = c.replace(
    /(id\s*:\s*["']s_on["'][\s\S]*?src\s*:\s*["'])images\/s_on(?:%20| )copy\.png(["'])/g,
    `$1${S_ON_DATA_URL}$2`,
  );
  c = c.replace(
    /(id\s*:\s*["']s_off["'][\s\S]*?src\s*:\s*["'])images\/s_off(?:%20| )copy\.png(["'])/g,
    `$1${S_OFF_DATA_URL}$2`,
  );
  c = c.replace(
    /(id\s*:\s*["']btn_replay["'][\s\S]*?src\s*:\s*["'])images\/preplaytvc0001\.png(["'])/g,
    `$1${BTN_REPLAY_DATA_URL}$2`,
  );
  c = c.replace(
    /(id\s*:\s*["']btn_play["'][\s\S]*?src\s*:\s*["'])images\/playBtn0001\.png(["'])/g,
    `$1${BTN_PLAY_DATA_URL}$2`,
  );
  c = c.replace(
    /(id\s*:\s*["']bg_videos["'][\s\S]*?src\s*:\s*["'])images\/htt\.png(["'])/g,
    `$1${BG_VIDEOS_DATA_URL}$2`,
  );
  return c;
}

function replaceDemoManifestScriptUrls(content: string): string {
  let c = content;
  c = c.replace(
    /src:\s*"https:\/\/code\.jquery\.com\/jquery-3\.4\.1\.min\.js[^"]*"/g,
    `src: "${DEMO_MANIFEST_JQUERY_SRC}"`,
  );
  c = c.replace(
    /src:\s*'https:\/\/code\.jquery\.com\/jquery-3\.4\.1\.min\.js[^']*'/g,
    `src: "${DEMO_MANIFEST_JQUERY_SRC}"`,
  );
  c = c.replace(
    /src:\s*"components\/sdk\/anwidget\.js[^"]*"/g,
    `src: "${DEMO_MANIFEST_ANWIDGET_SRC}"`,
  );
  c = c.replace(
    /src:\s*'components\/sdk\/anwidget\.js[^']*'/g,
    `src: "${DEMO_MANIFEST_ANWIDGET_SRC}"`,
  );
  c = c.replace(
    /src:\s*"components\/video\/src\/video\.js[^"]*"/g,
    `src: "${DEMO_MANIFEST_VIDEO_JS_SRC}"`,
  );
  c = c.replace(
    /src:\s*'components\/video\/src\/video\.js[^']*'/g,
    `src: "${DEMO_MANIFEST_VIDEO_JS_SRC}"`,
  );
  c = c.replace(
    /src:\s*"components\/ui\/src\/image\.js[^"]*"/g,
    `src: "${DEMO_MANIFEST_UI_IMAGE_JS_SRC}"`,
  );
  c = c.replace(
    /src:\s*'components\/ui\/src\/image\.js[^']*'/g,
    `src: "${DEMO_MANIFEST_UI_IMAGE_JS_SRC}"`,
  );
  return c;
}

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

async function resolveFormatForPreview(params: {
  remotePath: string;
  demoId?: string | null;
  demoValue?: string | null;
}): Promise<{ formatValue?: string; suggestions: string[] }> {
  const explicitValue = String(params.demoValue ?? "").trim();
  if (explicitValue) {
    return { formatValue: explicitValue, suggestions: [] };
  }

  const demos = await loadCreativeDemos();
  const explicitId = String(params.demoId ?? "").trim();
  if (explicitId) {
    const byId = demos.find((item) => String(item.id).trim() === explicitId);
    const value = String(byId?.value ?? "").trim();
    if (value) return { formatValue: value, suggestions: [] };
  }

  const size = extractSizeTokenFromRemotePath(params.remotePath);
  if (!size) return { suggestions: [] };
  const key = size.toLowerCase();
  const matchedBySize = demos.filter((item) => {
    const raw = item.size;
    if (Array.isArray(raw)) {
      return raw.some((entry) => String(entry ?? "").trim().toLowerCase() === key);
    }
    return String(raw ?? "").trim().toLowerCase() === key;
  });
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

function stripRedundantRelativeFolderPrefix(
  relativePath: string,
  opts: { remoteLeaf: string; uploadBaseToken: string },
): string {
  const normalized = relativePath.replace(/\\+/g, "/").replace(/^\/+/, "");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length < 2) return normalized;
  const first = parts[0] ?? "";
  const leaf = opts.remoteLeaf.trim();
  const base = opts.uploadBaseToken.trim();
  if ((leaf && first === leaf) || (base && first === base)) {
    return parts.slice(1).join("/");
  }
  return normalized;
}

function compressImageToDataUrl(file: File, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context not available"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        resolve(canvas.toDataURL("image/webp", quality));
      } catch (err) {
        reject(
          err instanceof Error ? err : new Error("Image compression failed"),
        );
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image load failed"));
    };
    img.src = objectUrl;
  });
}

async function convertTextWithBase64Images(
  file: File,
  imageByName: Map<string, string>,
): Promise<string> {
  let content = await file.text();
  content = replaceDemoManifestScriptUrls(content);
  content = replaceBundledDemoStaticImages(content);
  const lines = content.split(/\r?\n/);
  for (const [name, base64] of imageByName.entries()) {
    if (isBundledDemoAssetImageName(name)) continue;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      if (!line.includes(name)) continue;
      const idx = line.indexOf(name);
      if (idx === -1) continue;
      const afterNameIndex = idx + name.length;
      const nextDoubleQuoteIndex = line.indexOf('"', afterNameIndex);
      const nextSingleQuoteIndex = line.indexOf("'", afterNameIndex);
      const nextQuoteIndex =
        nextDoubleQuoteIndex === -1
          ? nextSingleQuoteIndex
          : nextSingleQuoteIndex === -1
            ? nextDoubleQuoteIndex
            : Math.min(nextDoubleQuoteIndex, nextSingleQuoteIndex);
      const quoteChar =
        nextQuoteIndex === -1
          ? '"'
          : nextQuoteIndex === nextSingleQuoteIndex
            ? "'"
            : '"';
      const suffixAfterQuote =
        nextQuoteIndex === -1
          ? line.slice(afterNameIndex)
          : line.slice(nextQuoteIndex + 1);
      const leadingWs = line.match(/^\s*/)?.[0] ?? "";
      lines[i] =
        `${leadingWs}{type:createjs.AbstractLoader.IMAGE, src:${quoteChar}${base64}${quoteChar}${suffixAfterQuote}`;
      break;
    }
  }
  return lines.join("\n");
}

const ChatView = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [aiProvider, setAiProvider] =
    useState<ChatAiProvider>(loadChatAiProvider);
  const { handleApiError } = useError();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const handleProviderChange = (next: ChatAiProvider) => {
    setAiProvider(next);
    saveChatAiProvider(next);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handlePickAttachments = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const next = Array.from(fileList).map((file, idx) => {
      const rel = (
        (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
        file.name
      ).trim();
      return {
        id: `${Date.now()}-${idx}-${file.name}`,
        file,
        relativePath: toPosixPath(rel || file.name),
      };
    });
    setAttachments((prev) => {
      const seen = new Set(prev.map((x) => x.relativePath));
      const merged = [...prev];
      for (const item of next) {
        if (seen.has(item.relativePath)) continue;
        merged.push(item);
        seen.add(item.relativePath);
      }
      return merged;
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((x) => x.id !== id));
  };

  const handleAttachmentButtonClick = () => {
    // Use a single picker action to avoid double dialog popups.
    folderInputRef.current?.click();
  };

  const runBuildDemoUploadTool = async (plan: {
    remotePath?: string | null;
    brand?: string | null;
    demoId?: string | null;
    demoValue?: string | null;
    overwrite?: boolean;
  }) => {
    if (attachments.length === 0) {
      throw new Error("No attached files found for upload.");
    }
    const sftpClient = createSftpClient();
    const logs: string[] = [];
    let uploaded = 0;
    const imageItems = attachments.filter((item) => isImageFile(item.file));
    const htmlItems = attachments.filter((item) => isHtmlFile(item.file));
    const jsItems = attachments.filter((item) => {
      const ext = (item.file.name.split(".").pop() ?? "").toLowerCase();
      return ext === "js";
    });
    const videoItems = attachments.filter((item) => isVideoFile(item.file));

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

    const selectedHtml = htmlItems[0] ?? null;
    const selectedJs = jsItems[0] ?? null;
    const selectedVideo = videoItems[0] ?? null;

    if (!selectedHtml || !selectedJs) {
      throw new Error(
        "Missing required files. Upload demo needs exactly: 1 HTML + 1 JS (base64). Video is optional.",
      );
    }

    const requestedRemotePath = String(plan.remotePath || "").trim();
    const brandToken = normalizePathToken(String(plan.brand || "").trim()).replace(
      /^brand-+/,
      "",
    );
    if (!requestedRemotePath && !brandToken) {
      throw new Error(
        "Missing brand for auto path. Use `brand: <name>` or provide full `path:`.",
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
    const sftpUploadBaseForStrip = "";

    const uploadTextItems = [selectedHtml, selectedJs];
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
      const converted = await convertTextWithBase64Images(
        item.file,
        imageBase64ByName,
      );
      const res = await sftpClient.write({
        path: remoteFilePath,
        content: converted,
      });
      if (!res?.ok) throw new Error(res?.error || `Upload failed: ${rel}`);
      uploaded++;
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
      if (action?.tool === "build_demo_convert_upload") {
        if (
          Array.isArray(action.requiredInputs) &&
          action.requiredInputs.includes("targetSourcePathOrBrand")
        ) {
          const missingMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "model",
            content:
              "Thiếu thông tin path/brand. Hãy gửi: `upload demo brand: <brand>` hoặc `upload demo path: <year>/<month>/<brand>/...`",
          };
          setMessages((prev) => [...prev, missingMsg]);
          setIsLoading(false);
          return;
        }
        try {
          const runResult = await runBuildDemoUploadTool(action);
          const okMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "model",
            content: [
              "BuildDemo upload completed.",
              `Remote: ${runResult.remoteBase}`,
              `Uploaded files: ${runResult.uploaded}`,
              runResult.formatValue ? `Format: ${runResult.formatValue}` : null,
              runResult.previewUrl
                ? `Preview: ${runResult.previewUrl}`
                : `Preview: could not generate URL for ${runResult.remotePath}`,
              !runResult.formatValue && runResult.formatSuggestions?.length
                ? `Suggestions: ${runResult.formatSuggestions.join(", ")}`
                : null,
            ]
              .filter((line): line is string => Boolean(line))
              .join("\n"),
          };
          setMessages((prev) => [...prev, okMsg]);
          if (runResult.previewUrl) {
            window.open(runResult.previewUrl, "_blank", "noopener,noreferrer");
          }
          setAttachments([]);
          setIsLoading(false);
          return;
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
          setIsLoading(false);
          return;
        }
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
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-400 dark:bg-slate-500 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      >
        <input
          ref={attachmentInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handlePickAttachments(e.target.files);
            e.currentTarget.value = "";
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handlePickAttachments(e.target.files);
            e.currentTarget.value = "";
          }}
          {...({
            webkitdirectory: "true",
            directory: "true",
          } as Record<string, string>)}
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
            placeholder='Hỏi tài liệu, hoặc "upload demo path:2026/.../300x250" + attach folder'
            className="flex-1 min-w-0 h-11 bg-transparent border-none rounded-xl px-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-0"
          />
          <Button
            type="button"
            onClick={handleAttachmentButtonClick}
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
