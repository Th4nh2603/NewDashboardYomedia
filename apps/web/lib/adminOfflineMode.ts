const STORAGE_KEY = "nova-admin-offline-mode";

/** Admin manually toggled offline (persisted). */
let manualEnabled = false;
/** Set when API connectivity probes fail; cleared on success. */
let autoEnabled = false;
let consecutiveConnectivityFailures = 0;

const listeners = new Set<() => void>();

const AUTO_OFFLINE_FAILURE_THRESHOLD = 2;

function notifyListeners() {
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  manualEnabled = localStorage.getItem(STORAGE_KEY) === "1";
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    manualEnabled = e.newValue === "1";
    notifyListeners();
  });
}

export function getAdminOfflineMode(): boolean {
  return manualEnabled;
}

/** Manual admin toggle or auto-detected API outage. */
export function getApiOfflineMode(): boolean {
  return manualEnabled || autoEnabled;
}

export function getAutoApiOfflineMode(): boolean {
  return autoEnabled;
}

export function setAdminOfflineMode(next: boolean): void {
  if (typeof window === "undefined") return;
  manualEnabled = next;
  if (next) localStorage.setItem(STORAGE_KEY, "1");
  else localStorage.removeItem(STORAGE_KEY);
  notifyListeners();
}

export function setAutoApiOfflineMode(next: boolean): void {
  if (autoEnabled === next) return;
  autoEnabled = next;
  if (!next) consecutiveConnectivityFailures = 0;
  notifyListeners();
}

export function isApiConnectivityFailure(
  status: number,
  code?: string,
): boolean {
  if (status === 0 || code === "NETWORK_ERROR") return true;
  return status === 502 || status === 503 || status === 504;
}

/** Successful health probe — clears auto-offline immediately. */
export function reportHealthProbeSuccess(): void {
  consecutiveConnectivityFailures = 0;
  if (autoEnabled) setAutoApiOfflineMode(false);
}

/** Failed health probe — enables auto-offline immediately. */
export function reportHealthProbeFailure(): void {
  consecutiveConnectivityFailures = AUTO_OFFLINE_FAILURE_THRESHOLD;
  if (!autoEnabled) setAutoApiOfflineMode(true);
}

/** Non-health API call succeeded — does not clear auto-offline (health probe owns recovery). */
export function reportApiConnectivitySuccess(): void {
  consecutiveConnectivityFailures = 0;
}

/** Non-health connectivity failure — enables auto-offline after repeated failures. */
export function reportApiConnectivityFailure(): void {
  consecutiveConnectivityFailures += 1;
  if (
    consecutiveConnectivityFailures >= AUTO_OFFLINE_FAILURE_THRESHOLD &&
    !autoEnabled
  ) {
    setAutoApiOfflineMode(true);
  }
}

export function subscribeAdminOfflineMode(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function resolveRequestUrl(input: RequestInfo | URL): URL {
  if (typeof input === "string") {
    return new URL(input, window.location.origin);
  }
  if (input instanceof Request) {
    return new URL(input.url);
  }
  return new URL(input.href);
}

/** tRPC health probe — allowed through fetch gate while auto-offline so we can recover. */
export function isApiHealthProbeUrl(u: URL): boolean {
  if (u.pathname.includes("health.check")) return true;
  const batch = u.searchParams.get("batch");
  if (batch && decodeURIComponent(batch).includes("health.check")) {
    return true;
  }
  return false;
}

function isDashboardApiUrl(u: URL): boolean {
  if (u.pathname.startsWith("/api/")) return true;
  if (u.pathname.startsWith("/api/trpc")) return true;

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

/**
 * Returns true when offline mode is active and the request targets our Express API.
 * Auto-offline still allows health probes so connectivity can be re-established.
 */
export function isBlockedAdminOfflineFetchTarget(
  input: RequestInfo | URL,
): boolean {
  if (typeof window === "undefined" || !getApiOfflineMode()) return false;

  const u = resolveRequestUrl(input);
  if (!isDashboardApiUrl(u)) return false;

  if (!manualEnabled && autoEnabled && isApiHealthProbeUrl(u)) {
    return false;
  }

  return true;
}
