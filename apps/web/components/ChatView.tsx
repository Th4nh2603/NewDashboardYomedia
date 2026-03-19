import React, { useState, useRef, useEffect } from "react";
import { useError } from "../contexts/ErrorContext";

type ChatMessage = {
  id: string;
  role: "user" | "model";
  content: string;
};

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
    if (idx > lastIndex) parts.push(text.slice(lastIndex, idx));

    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={`${idx}-b`} className="font-semibold text-slate-900 dark:text-slate-100">
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
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
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
      <div key={key} className="whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200">
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
    lines.some((l) => l.startsWith("Directory:")) || lines.some((l) => l.startsWith("SFTP:"));
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
          const isOk = line.includes("ĐÃ TỒN TẠI");
          const isMissing = line.includes("CHƯA TỒN TẠI");
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

        if (line.toLowerCase().includes("banner có thể setup")) {
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

        if (line.toLowerCase().includes("không kiểm tra được sftp")) {
          return (
            <div key={idx} className="text-sm text-amber-700 dark:text-amber-300">
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

const ChatView = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { handleApiError } = useError();
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMsg]);

    // Nếu input là URL có chứa tham số b=...index.html thì decode và trả lại phần giữa b= và index.html cho user,
    // và không gửi request này lên AI.
    try {
      const decoded = decodeURIComponent(input);
      const match = decoded.match(/b=([^&]*?)index\.html/);
      if (match && match[1]) {
        const extractedRaw = match[1]; // ví dụ: 2026/03/romano/384x683/
        const displayDir = extractedRaw
          .replace(/index\.html$/i, "")
          .replace(/^\/+/, "")
          .replace(/\/+$/, "");

        const sftpDir = `/${displayDir}/`.replace(/\/{2,}/g, "/");

        const baseUrl =
          import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

        let exists: boolean | null = null;
        let message: string | null = null;
        try {
          const res = await fetch(
            `${baseUrl}/api/sftp/exists?path=${encodeURIComponent(sftpDir)}`,
          );
          const data = (await res.json()) as
            | { ok: true; exists: boolean; message?: string | null }
            | { ok: false; error?: string };

          if (res.ok && data.ok) {
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
            ? `Directory: ${displayDir}\nKhông kiểm tra được SFTP (network/server error).`
            : exists
              ? `Directory: ${displayDir}\nSFTP: ĐÃ TỒN TẠI.\n${message || ""}`.trim()
              : `Directory: ${displayDir}\nSFTP: CHƯA TỒN TẠI.`;

        const extractedMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "model",
          content,
        };
        setMessages((prev) => [...prev, extractedMsg]);
        setInput("");
        return;
      }
    } catch (err) {
      console.error("Failed to decode URL from input", err);
    }

    setInput("");
    setIsLoading(true);

    try {
      const baseUrl =
        import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

      const res = await fetch(`${baseUrl}/api/rag/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input }),
      });

      const data = (await res.json()) as
        | { ok: true; answer?: string }
        | { ok: false; error?: string };

      if (!res.ok || !data.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Request failed. Please try again.",
        );
      }

      const modelMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: "model",
        content: data.answer || "Sorry, I could not generate a response.",
      };
      setMessages((prev) => [...prev, modelMsg]);
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
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <h2 className="font-bold text-slate-900 dark:text-white">
            Gemini 3 Pro
          </h2>
        </div>
        <button
          onClick={() => setMessages([])}
          className="text-xs text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-slate-100 transition-colors"
        >
          Clear History
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-slate-50 dark:bg-transparent"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40 text-slate-500 dark:text-slate-100">
            <ChatBubbleBottomCenterTextIcon className="w-16 h-16 mb-4" />
            <p className="text-xl font-medium">
              Start a conversation with YomediaAI
            </p>
            <p className="text-sm">
              YomediaAI can help you with coding, writing, and logic.
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
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-4 pl-4 pr-12 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-indigo-500/20"
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
          </button>
        </div>
      </form>
    </div>
  );
};

const ChatBubbleBottomCenterTextIcon = ({ className }) => (
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
