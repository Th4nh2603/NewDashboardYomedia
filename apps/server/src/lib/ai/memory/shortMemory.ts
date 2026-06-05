import { MAX_HISTORY_TURNS } from "../core/config.js";
import type { ChatAttachmentMeta, MemoryMessage } from "../core/types.js";

const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000;

type SessionEntry = {
  messages: MemoryMessage[];
  buildDemoAttachments: ChatAttachmentMeta[];
  updatedAt: number;
};

const sessions = new Map<string, SessionEntry>();

function shortMemoryTtlMs(): number {
  const raw = process.env.SHORT_MEMORY_TTL_MS;
  const parsed = raw ? Number(raw) : DEFAULT_TTL_MS;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_MS;
}

export function buildShortMemoryKey(input: {
  email?: string;
  role: string;
  sessionId?: string;
}): string {
  const user =
    String(input.email || "").trim().toLowerCase() ||
    `role:${String(input.role || "guest").trim() || "guest"}`;
  const session = String(input.sessionId || "").trim() || "default";
  return `${user}::${session}`;
}

function pruneExpired(now = Date.now()) {
  const ttl = shortMemoryTtlMs();
  for (const [key, entry] of sessions) {
    if (now - entry.updatedAt > ttl) {
      sessions.delete(key);
    }
  }
}

function getOrCreateSession(key: string): SessionEntry {
  const existing = sessions.get(key);
  if (existing) return existing;
  const entry: SessionEntry = {
    messages: [],
    buildDemoAttachments: [],
    updatedAt: Date.now(),
  };
  sessions.set(key, entry);
  return entry;
}

export function getShortMemory(key: string): MemoryMessage[] {
  pruneExpired();
  return sessions.get(key)?.messages ?? [];
}

/** Merge pending Build Demo files with this turn; persists until upload succeeds. */
export function getBuildDemoAttachments(key: string): ChatAttachmentMeta[] {
  pruneExpired();
  return [...(sessions.get(key)?.buildDemoAttachments ?? [])];
}

export function mergeBuildDemoAttachments(
  key: string,
  incoming: ChatAttachmentMeta[],
): ChatAttachmentMeta[] {
  pruneExpired();
  const entry = getOrCreateSession(key);
  const attachmentKey = (att: ChatAttachmentMeta) =>
    (att.relativePath || att.name).trim().toLowerCase();

  const byName = new Map(
    entry.buildDemoAttachments.map((att) => [attachmentKey(att), att]),
  );
  for (const att of incoming) {
    if (!att.name?.trim()) continue;
    byName.set(attachmentKey(att), att);
  }
  const merged = [...byName.values()];
  entry.buildDemoAttachments = merged;
  entry.updatedAt = Date.now();
  sessions.set(key, entry);
  return merged;
}

export function clearBuildDemoAttachments(key: string): void {
  const entry = sessions.get(key);
  if (!entry) return;
  entry.buildDemoAttachments = [];
  entry.updatedAt = Date.now();
}

export function hasBuildDemoAttachments(key: string): boolean {
  pruneExpired();
  return (sessions.get(key)?.buildDemoAttachments.length ?? 0) > 0;
}

export function appendShortMemoryTurn(
  key: string,
  userContent: string,
  assistantContent: string,
): MemoryMessage[] {
  pruneExpired();
  const entry = getOrCreateSession(key);
  const next = [
    ...entry.messages,
    { role: "user" as const, content: userContent },
    { role: "assistant" as const, content: assistantContent },
  ].slice(-MAX_HISTORY_TURNS * 2) satisfies MemoryMessage[];
  entry.messages = next;
  entry.updatedAt = Date.now();
  sessions.set(key, entry);
  return next;
}

export function clearShortMemory(key: string): void {
  sessions.delete(key);
}

export function clearShortMemoryByPrefix(userPrefix: string): number {
  const prefix = `${userPrefix}::`;
  let removed = 0;
  for (const key of sessions.keys()) {
    if (key.startsWith(prefix)) {
      sessions.delete(key);
      removed += 1;
    }
  }
  return removed;
}
