import React, { useEffect, useRef, useState } from "react";
import {
  CHAT_AI_PROVIDER_OPTIONS,
  ChatAiProvider,
  chatProviderLabel,
  loadChatAiProvider,
  saveChatAiProvider,
} from "../../../lib/chatAiProvider";
import { api } from "../../../lib/trpc/api";
import { getApiErrorMessage } from "../../../lib/apiErrorPresentation";
import { useError } from "../../../contexts/ErrorContext";
import { shouldShowBuildDemoProgress } from "../../../lib/buildDemoChatProgress";
import {
  collectFilesFromDataTransfer,
  formatSelectedUploadsSummary,
  mergeChatUploads,
  readFileAsDataUrl,
  type ChatSelectedUpload,
} from "../../../lib/chatAttachments";
import { downloadPlacementCodesZip } from "../../../lib/placementCodesDownload";
import BuildDemoProgress from "../../../components/BuildDemoProgress";
import ChatMessageContent from "./ChatMessageContent";

type Message = {
  id: string;
  role: "user" | "system" | "assistant";
  content: string;
};

type ChatAttachmentMeta = {
  name: string;
  relativePath?: string;
  size: number;
  mimeType?: string;
  contentBase64?: string;
  encoding?: "base64";
};

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
};

const CHAT_STORAGE_KEY = "yomedia.chat.conversations.v1";
const MAX_CONVERSATIONS = 30;

type BuildProgressState = {
  label: string;
  percent: number;
};

const BUILD_DEMO_PROGRESS_COMPLETE_MS = 600;

function progressLabelForPercent(percent: number): string {
  if (percent < 30) return "Đang phân tích brand, format và file…";
  if (percent < 65) return "Đang chuẩn bị upload lên SFTP…";
  if (percent < 90) return "Đang ghi demo và VAST XML…";
  if (percent < 100) return "Đang hoàn tất…";
  return "Hoàn tất upload SFTP…";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function messageBubbleClass(role: Message["role"]): string {
  const base = "max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed border";
  if (role === "user") {
    return `${base} rounded-tr-none border-indigo-500/30 bg-indigo-600 text-white dark:bg-indigo-500 dark:border-indigo-400/40`;
  }
  if (role === "system") {
    return `${base} rounded-tl-none border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-100`;
  }
  return `${base} rounded-tl-none border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200`;
}

function buildWelcomeMessage(): Message {
  return {
    id: "welcome",
    role: "system",
    content: "Chat mới đã sẵn sàng",
  };
}

function createNewConversation(): Conversation {
  const now = new Date();
  return {
    id: `c-${now.getTime()}`,
    title: `Chat mới ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    createdAt: now.toISOString(),
    messages: [buildWelcomeMessage()],
  };
}

function normalizeConversations(raw: unknown): Conversation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): Conversation | null => {
      if (!item || typeof item !== "object") return null;
      const conv = item as Partial<Conversation>;
      if (
        typeof conv.id !== "string" ||
        typeof conv.title !== "string" ||
        typeof conv.createdAt !== "string" ||
        !Array.isArray(conv.messages)
      ) {
        return null;
      }
      const messages = conv.messages.filter(
        (m): m is Message =>
          !!m &&
          typeof m.id === "string" &&
          (m.role === "user" ||
            m.role === "assistant" ||
            m.role === "system") &&
          typeof m.content === "string",
      );
      if (!messages.length) return null;
      return {
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt,
        messages,
      };
    })
    .filter((c): c is Conversation => c !== null);
}

function loadStoredConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return normalizeConversations(parsed);
  } catch {
    return [];
  }
}

const Chat = () => {
  const { handleApiError } = useError();
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const stored = loadStoredConversations();
    const fresh = createNewConversation();
    return [fresh, ...stored].slice(0, MAX_CONVERSATIONS);
  });
  const [activeConversationId, setActiveConversationId] = useState<string>("");
  const [input, setInput] = useState("");
  const [selectedUploads, setSelectedUploads] = useState<ChatSelectedUpload[]>(
    [],
  );
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [buildProgress, setBuildProgress] = useState<BuildProgressState | null>(
    null,
  );
  const [provider, setProvider] = useState<ChatAiProvider>(() =>
    loadChatAiProvider(),
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOverUpload, setIsDragOverUpload] = useState(false);

  const addUploadFiles = (incoming: FileList | File[]) => {
    const picked = Array.from(incoming);
    setSelectedUploads((prev) => {
      const before = prev.length;
      const { uploads, skipped } = mergeChatUploads(prev, picked);
      const added = uploads.length - before;
      let notice: string | null = null;
      if (skipped.length > 0) {
        notice = skipped.slice(0, 5).join("\n");
      } else if (picked.length > 0 && added === 0) {
        notice = "File đã được chọn trước đó.";
      }
      setUploadNotice(notice);
      return uploads;
    });
  };
  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ||
    conversations[0];
  const messages = activeConversation?.messages ?? [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      // Ignore storage failures.
    }
  }, [conversations]);

  useEffect(() => {
    if (!activeConversationId && conversations[0]?.id) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations]);

  const updateConversationMessages = (
    conversationId: string,
    updater: (prev: Message[]) => Message[],
  ) => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id !== conversationId) return conv;
        const nextMessages = updater(conv.messages);
        const firstUser = nextMessages.find((m) => m.role === "user");
        const nextTitle = firstUser
          ? firstUser.content.slice(0, 40)
          : conv.title;
        return {
          ...conv,
          messages: nextMessages,
          title: nextTitle,
        };
      }),
    );
  };
  // TODO: Add error handling for the API call
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeConversation) return;
    const text = input.trim();
    if ((!text && selectedUploads.length === 0) || isSending) return;

    const filesSummary = formatSelectedUploadsSummary(selectedUploads);
    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: filesSummary ? `${text}\n[Files: ${filesSummary}]`.trim() : text,
    };

    updateConversationMessages(activeConversation.id, (prev) => [
      ...prev,
      userMessage,
    ]);
    setInput("");
    setIsSending(true);
    const showBuildProgress = shouldShowBuildDemoProgress(
      text,
      selectedUploads.length > 0,
      messages,
    );
    let progressTimer: ReturnType<typeof setInterval> | null = null;
    if (showBuildProgress) {
      setBuildProgress({ label: progressLabelForPercent(8), percent: 8 });
      progressTimer = setInterval(() => {
        setBuildProgress((prev) => {
          if (!prev) return prev;
          const nextPercent = Math.min(
            92,
            prev.percent + (prev.percent < 50 ? 6 : 3),
          );
          return {
            percent: nextPercent,
            label: progressLabelForPercent(nextPercent),
          };
        });
      }, 450);
    } else {
      setBuildProgress(null);
    }
    try {
      let attachments: ChatAttachmentMeta[] | undefined;
      if (selectedUploads.length > 0) {
        attachments = await Promise.all(
          selectedUploads.map(async ({ file, relativePath }) => {
            const contentBase64 = await readFileAsDataUrl(file);
            return {
              name: file.name,
              relativePath,
              size: file.size,
              mimeType: file.type || undefined,
              contentBase64,
              encoding: "base64" as const,
            };
          }),
        );
      }
      const res = await api.rag.query(
        text || "upload demo",
        provider,
        attachments,
        activeConversation.id,
      );
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      if (res.ok && res.buildDemoProcessing && showBuildProgress) {
        setBuildProgress({
          label: progressLabelForPercent(100),
          percent: 100,
        });
        await delay(BUILD_DEMO_PROGRESS_COMPLETE_MS);
        setBuildProgress(null);
      } else if (showBuildProgress) {
        setBuildProgress(null);
      }
      let replyContent = res.answer || "Không có phản hồi.";
      if (res.ok && res.placementCodesDownload) {
        const placementDownload = res.placementCodesDownload;
        try {
          const downloaded = await downloadPlacementCodesZip({
            websiteName: placementDownload.websiteName,
            variant: placementDownload.variant,
          });
          const count =
            downloaded.matchedCount ?? placementDownload.matchedCount;
          replyContent = `${replyContent}\n\nĐã tải về máy: **${downloaded.downloadName}** (${count} placement).`;
        } catch (downloadErr) {
          const downloadMessage = getApiErrorMessage(downloadErr, "Download");
          replyContent = `${replyContent}\n\nKhông tải được ZIP: ${downloadMessage}`;
        }
      }
      const reply: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: replyContent,
      };
      updateConversationMessages(activeConversation.id, (prev) => [
        ...prev,
        reply,
      ]);
      setSelectedUploads([]);
      setUploadNotice(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      handleApiError(err, "Chat");
      const message = getApiErrorMessage(err, "Chat");
      const reply: Message = {
        id: `e-${Date.now()}`,
        role: "system",
        content: `Không thể gọi AI: ${message}`,
      };
      updateConversationMessages(activeConversation.id, (prev) => [
        ...prev,
        reply,
      ]);
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      setIsSending(false);
      setBuildProgress(null);
    }
  };

  const handleProviderChange = (nextProvider: ChatAiProvider) => {
    setProvider(nextProvider);
    saveChatAiProvider(nextProvider);
  };

  const historyConversations = conversations.filter(
    (c) => c.id !== activeConversation?.id,
  );

  const handleClearOldConversations = async () => {
    const removedIds = historyConversations.map((c) => c.id);
    setConversations((prev) =>
      prev.filter((conv) => conv.id === activeConversation?.id),
    );
    await Promise.all(
      removedIds.map((sessionId) =>
        api.rag.clearSession({ sessionId }).catch(() => undefined),
      ),
    );
  };

  const handleClearCurrentSession = async () => {
    if (!activeConversation || isSending) return;
    const sessionId = activeConversation.id;
    const now = new Date();
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === sessionId
          ? {
              ...conv,
              title: `Chat mới ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
              messages: [buildWelcomeMessage()],
            }
          : conv,
      ),
    );
    setInput("");
    setSelectedUploads([]);
    setUploadNotice(null);
    setBuildProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await api.rag.clearSession({ sessionId }).catch(() => undefined);
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-6rem)] grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-4">
      <div className="flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl transition-colors duration-300">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">Chat</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Giao diện chat cơ bản - Provider: {chatProviderLabel(provider)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void handleClearCurrentSession()}
                disabled={isSending}
                className="h-8 px-2.5 rounded-md border border-slate-300 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                title="Xóa tin nhắn và bộ nhớ AI của hội thoại này"
              >
                Xóa phiên
              </button>
              <select
                value={provider}
                onChange={(e) =>
                  handleProviderChange(e.target.value as ChatAiProvider)
                }
                className="h-8 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Select AI provider"
              >
                {CHAT_AI_PROVIDER_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-transparent"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={messageBubbleClass(m.role)}>
                <ChatMessageContent content={m.content} variant={m.role} />
              </div>
            </div>
          ))}
          {buildProgress ? (
            <div className="flex justify-start">
              <BuildDemoProgress
                label={buildProgress.label}
                percent={buildProgress.percent}
              />
            </div>
          ) : null}
        </div>

        <form
          onSubmit={handleSend}
          className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          onDragEnter={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setIsDragOverUpload(true);
            }
          }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) setIsDragOverUpload(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOverUpload(false);
            void (async () => {
              const files = await collectFilesFromDataTransfer(e.dataTransfer);
              if (files.length) addUploadFiles(files);
            })();
          }}
        >
          <div
            className={`relative flex items-center gap-2 rounded-2xl border p-2 transition-colors ${
              isDragOverUpload
                ? "border-indigo-400 bg-indigo-50/80 dark:border-indigo-500 dark:bg-indigo-950/40"
                : "border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/70"
            }`}
          >
            {isDragOverUpload ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-indigo-500/10 text-xs font-medium text-indigo-700 dark:text-indigo-200">
                Thả file hoặc thư mục vào đây
              </div>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.webp,.gif,.svg,.mp4,.webm,.mov,.m4v,.mkv,.mpeg,.mpg,.html,.htm,.js,.mjs,.css,.zip,video/mp4,video/webm,video/quicktime,video/x-m4v,image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const list = e.target.files;
                if (!list?.length) return;
                addUploadFiles(list);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 h-10 px-2.5 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-xs font-medium"
              title="Chọn file (kéo thả cả thư mục vào ô chat)"
            >
              File
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="flex-1 min-w-0 h-11 bg-transparent border-none rounded-xl px-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-0"
            />
            <button
              type="submit"
              disabled={
                (!input.trim() && selectedUploads.length === 0) || isSending
              }
              className="shrink-0 h-10 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              Send
            </button>
          </div>
          {selectedUploads.length > 0 ? (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Đã chọn {selectedUploads.length} file —{" "}
                {formatSelectedUploadsSummary(selectedUploads)}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedUploads([]);
                  setUploadNotice(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Xóa tất cả file đã chọn
              </button>
            </div>
          ) : null}
          {uploadNotice ? (
            <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300 whitespace-pre-line">
              {uploadNotice}
            </p>
          ) : null}
        </form>
      </div>

      <aside className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Hội thoại cũ
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Refresh sẽ tạo chat mới.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearOldConversations}
              disabled={historyConversations.length === 0}
              className="shrink-0 text-[11px] px-2 py-1 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              Xóa cũ
            </button>
          </div>
        </div>
        <div className="p-2 space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {historyConversations.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 p-2">
              Chưa có hội thoại cũ.
            </p>
          ) : (
            historyConversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => setActiveConversationId(conv.id)}
                className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-700 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <p className="text-xs font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                  {conv.title}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {new Date(conv.createdAt).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};

export default Chat;
