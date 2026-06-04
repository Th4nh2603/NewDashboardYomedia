import React from "react";
import { Link } from "react-router-dom";
import { findBrandColorClass } from "../lib/brandColors";

type MessageVariant = "user" | "assistant" | "system";

type Block =
  | { type: "paragraph"; lines: string[] }
  | { type: "list"; items: string[] };

const BUILD_DEMO_SUCCESS_PREFIX = "Build Demo thành công";
const BUILD_DEMO_FAILURE_PREFIX = "Build Demo thất bại";

type RowHighlight =
  | "brand"
  | "format"
  | "count"
  | "remote"
  | "open-demo"
  | "preview"
  | null;

function isBuildDemoSuccess(content: string): boolean {
  return content.trimStart().startsWith(BUILD_DEMO_SUCCESS_PREFIX);
}

function isBuildDemoFailure(content: string): boolean {
  return content.trimStart().startsWith(BUILD_DEMO_FAILURE_PREFIX);
}

function listItemLabelKey(item: string): string | null {
  const colon = item.indexOf(":");
  if (colon <= 0) return null;
  return item.slice(0, colon).replace(/:$/, "").trim().toLowerCase();
}

function listItemHighlight(
  item: string,
  buildDemoSuccess: boolean,
): RowHighlight {
  if (!buildDemoSuccess) return null;
  const key = listItemLabelKey(item);
  if (!key) {
    return item.includes("https://") ? "preview" : null;
  }
  if (key === "brand") return "brand";
  if (key === "format") return "format";
  if (key === "remote") return "remote";
  if (key === "files uploaded" || key.startsWith("images inlined")) {
    return "count";
  }
  if (key === "open demo") return "open-demo";
  if (item.includes("https://")) return "preview";
  return null;
}

function splitBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.split("\n");
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", lines: [...paragraph] });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (list.length) {
      blocks.push({ type: "list", items: [...list] });
      list = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      flushParagraph();
      continue;
    }
    if (trimmed.startsWith("- ")) {
      flushParagraph();
      list.push(trimmed.slice(2));
      continue;
    }
    flushList();
    paragraph.push(trimmed);
  }

  flushList();
  flushParagraph();
  return blocks;
}

function routeHref(raw: string): string | null {
  const path = raw.startsWith("#/") ? raw.slice(1) : raw.startsWith("/") ? raw : null;
  return path;
}

function externalLinkClass(variant: MessageVariant): string {
  if (variant === "user") {
    return "underline underline-offset-2 text-indigo-100 hover:text-white font-medium break-all";
  }
  return "text-indigo-600 dark:text-violet-400 hover:text-indigo-500 dark:hover:text-violet-300 hover:underline font-medium break-all";
}

function strongClassForText(
  text: string,
  variant: MessageVariant,
  highlight: RowHighlight,
): string {
  if (highlight === "format") {
    return variant === "user"
      ? "font-semibold text-sky-100"
      : "font-semibold text-sky-600 dark:text-sky-300";
  }
  if (highlight === "count") {
    return variant === "user"
      ? "font-semibold text-amber-100"
      : "font-semibold text-amber-600 dark:text-amber-300";
  }
  if (highlight === "preview") {
    return variant === "user"
      ? "font-semibold text-violet-100"
      : "font-semibold text-violet-600 dark:text-violet-300";
  }
  const brandClass = findBrandColorClass(text);
  if (brandClass) return `font-semibold ${brandClass}`;
  if (variant === "user") return "font-semibold text-white";
  return "font-semibold text-slate-900 dark:text-slate-100";
}

function codeClassForVariant(
  variant: MessageVariant,
  highlight: RowHighlight,
): string {
  if (variant === "user") {
    return "rounded px-1.5 py-0.5 bg-indigo-700/70 text-indigo-50 font-mono text-[0.8em]";
  }
  if (variant === "system") {
    return "rounded px-1.5 py-0.5 bg-amber-100/80 dark:bg-amber-900/40 font-mono text-[0.8em]";
  }
  if (highlight === "remote") {
    return "rounded px-1.5 py-0.5 bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-mono text-[0.8em] break-all";
  }
  return "rounded px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700/80 font-mono text-[0.8em]";
}

function labelClassForRow(
  variant: MessageVariant,
  highlight: RowHighlight,
): string {
  const base = "shrink-0";
  if (variant === "user") {
    return `${base} text-indigo-100/90`;
  }
  if (highlight === "open-demo") {
    return `${base} font-semibold text-indigo-600 dark:text-indigo-300`;
  }
  if (highlight === "preview") {
    return `${base} text-violet-600/90 dark:text-violet-400/90`;
  }
  return `${base} text-slate-500 dark:text-slate-400`;
}

function appendPlainTextWithUrls(
  text: string,
  variant: MessageVariant,
  keyPrefix: string,
  nodes: React.ReactNode[],
): void {
  const urlRe = /(https?:\/\/[^\s<>)]+)/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  let part = 0;
  while ((match = urlRe.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const url = match[0];
    nodes.push(
      <a
        key={`${keyPrefix}-url-${part++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={externalLinkClass(variant)}
      >
        {url}
      </a>,
    );
    last = match.index + url.length;
  }
  if (last < text.length) {
    const tail = text.slice(last);
    if (tail) nodes.push(tail);
  }
  if (nodes.length === 0 && text) {
    nodes.push(text);
  }
}

function parseInline(
  text: string,
  variant: MessageVariant,
  keyPrefix: string,
  highlight: RowHighlight = null,
): React.ReactNode[] {
  const codeClass = codeClassForVariant(variant, highlight);
  const colorStrong =
    highlight === "brand" ||
    highlight === "format" ||
    highlight === "count" ||
    highlight === "preview";

  const nodes: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith("**")) {
      const inner = token.slice(2, -2);
      nodes.push(
        <strong
          key={key}
          className={
            colorStrong
              ? strongClassForText(inner, variant, highlight)
              : "font-semibold"
          }
        >
          {inner}
        </strong>,
      );
    } else {
      const inner = token.slice(1, -1);
      const href = routeHref(inner);
      if (href) {
        nodes.push(
          <Link
            key={key}
            to={href}
            className={
              variant === "user"
                ? "underline underline-offset-2 text-indigo-100 hover:text-white font-medium"
                : "text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            }
          >
            {inner}
          </Link>,
        );
      } else {
        nodes.push(
          <code key={key} className={codeClass}>
            {inner}
          </code>,
        );
      }
    }
    last = re.lastIndex;
  }

  if (last < text.length) {
    appendPlainTextWithUrls(
      text.slice(last),
      variant,
      `${keyPrefix}-tail`,
      nodes,
    );
  }
  return nodes.length ? nodes : [text];
}

function paragraphClass(
  line: string,
  lineIndex: number,
  blocksLength: number,
  variant: MessageVariant,
  buildDemoSuccess: boolean,
  buildDemoFailure: boolean,
): string {
  const base = "m-0 whitespace-pre-wrap break-words";
  if (lineIndex !== 0 || blocksLength <= 1) return base;
  if (buildDemoSuccess) {
    return `${base} font-semibold text-emerald-700 dark:text-emerald-400`;
  }
  if (buildDemoFailure) {
    return `${base} font-semibold text-red-700 dark:text-red-400`;
  }
  if (variant === "user") {
    return `${base} font-medium text-white`;
  }
  return `${base} font-medium`;
}

type ChatMessageContentProps = {
  content: string;
  variant: MessageVariant;
};

const ChatMessageContent: React.FC<ChatMessageContentProps> = ({
  content,
  variant,
}) => {
  const blocks = splitBlocks(content);
  const hasList = blocks.some((b) => b.type === "list");
  const buildDemoSuccess = isBuildDemoSuccess(content);
  const buildDemoFailure = isBuildDemoFailure(content);

  return (
    <div className={hasList ? "space-y-3" : "space-y-2"}>
      {blocks.map((block, blockIndex) => {
        if (block.type === "list") {
          const openDemoIndex = buildDemoSuccess
            ? block.items.findIndex(
                (item) => listItemLabelKey(item) === "open demo",
              )
            : -1;

          return (
            <ul
              key={`list-${blockIndex}`}
              className="space-y-1.5 text-[0.9375rem] list-none m-0 p-0"
            >
              {block.items.map((item, itemIndex) => {
                const colon = item.indexOf(":");
                const label = colon > 0 ? item.slice(0, colon + 1) : null;
                const value = colon > 0 ? item.slice(colon + 1).trim() : item;
                const highlight = listItemHighlight(item, buildDemoSuccess);
                const isPreviewChild =
                  openDemoIndex >= 0 && itemIndex > openDemoIndex;

                return (
                  <li
                    key={`item-${blockIndex}-${itemIndex}`}
                    className={[
                      "flex flex-wrap gap-x-1.5 gap-y-0.5 pl-0",
                      highlight === "open-demo"
                        ? "border-t border-slate-200 dark:border-slate-600/80 pt-2.5 mt-1"
                        : "",
                      isPreviewChild
                        ? "pl-3 ml-0.5 border-l-2 border-indigo-400/40 dark:border-violet-500/35"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {label ? (
                      <>
                        <span
                          className={labelClassForRow(variant, highlight)}
                        >
                          {label}
                        </span>
                        <span className="min-w-0 break-all">
                          {parseInline(
                            value,
                            variant,
                            `li-${blockIndex}-${itemIndex}`,
                            highlight,
                          )}
                        </span>
                      </>
                    ) : (
                      parseInline(
                        item,
                        variant,
                        `li-${blockIndex}-${itemIndex}`,
                        highlight,
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          );
        }

        return block.lines.map((line, lineIndex) => (
          <p
            key={`p-${blockIndex}-${lineIndex}`}
            className={paragraphClass(
              line,
              lineIndex,
              blocks.length,
              variant,
              buildDemoSuccess,
              buildDemoFailure,
            )}
          >
            {parseInline(line, variant, `p-${blockIndex}-${lineIndex}`)}
          </p>
        ));
      })}
    </div>
  );
};

export default ChatMessageContent;
