const STORAGE_KEY = "nova-admin-offline-mode";

let enabled = false;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  enabled = localStorage.getItem(STORAGE_KEY) === "1";
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    enabled = e.newValue === "1";
    listeners.forEach((l) => l());
  });
}

export function getAdminOfflineMode(): boolean {
  return enabled;
}

export function setAdminOfflineMode(next: boolean): void {
  if (typeof window === "undefined") return;
  enabled = next;
  if (next) localStorage.setItem(STORAGE_KEY, "1");
  else localStorage.removeItem(STORAGE_KEY);
  listeners.forEach((l) => l());
}

export function subscribeAdminOfflineMode(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * Returns true when admin offline mode is on and the request targets our Express API.
 */
export function isBlockedAdminOfflineFetchTarget(input: RequestInfo | URL): boolean {
  if (typeof window === "undefined" || !getAdminOfflineMode()) return false;

  let href: string;
  if (typeof input === "string") {
    href = new URL(input, window.location.origin).href;
  } else if (input instanceof Request) {
    href = input.url;
  } else {
    href = input.href;
  }

  const u = new URL(href);
  if (u.pathname.startsWith("/api/")) return true;

  const raw =
    typeof import.meta.env.VITE_SERVER_URL === "string"
      ? import.meta.env.VITE_SERVER_URL.trim()
      : "";
  if (raw) {
    try {
      const origin = new URL(raw.replace(/\/+$/, "")).origin;
      if (u.origin === origin && u.pathname.startsWith("/api/")) return true;
    } catch {
      /* ignore invalid env */
    }
  }

  if (
    !import.meta.env.DEV &&
    u.hostname === "localhost" &&
    (u.port === "3001" || u.port === "") &&
    u.pathname.startsWith("/api/")
  ) {
    return true;
  }

  return false;
}
