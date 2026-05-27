export type PersistedBuildDemoUploadResult = {
  sftpUploadPopupPayload: unknown | null;
  lastSuccessfulSftpUpload: unknown | null;
};

const LEGACY_LOCAL_STORAGE_KEY_PREFIX = "yomedia-build-demo-upload-result:";

function uploadResultStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function getBuildDemoUploadResultStorageKey(
  userEmail?: string | null,
): string {
  const id = userEmail?.trim().toLowerCase() || "guest";
  return `${LEGACY_LOCAL_STORAGE_KEY_PREFIX}${id}`;
}

/** Drop keys written before sessionStorage migration. */
function removeLegacyLocalStorageUploadResult(storageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
}

function removeLegacyLocalStorageForUser(userEmail?: string | null): void {
  removeLegacyLocalStorageUploadResult(
    getBuildDemoUploadResultStorageKey(userEmail),
  );
}

export function clearBuildDemoUploadResultForUser(
  userEmail?: string | null,
): void {
  const storage = uploadResultStorage();
  if (!storage) return;
  try {
    storage.removeItem(getBuildDemoUploadResultStorageKey(userEmail));
  } catch {
    // ignore
  }
  removeLegacyLocalStorageForUser(userEmail);
}

/** Clears stored upload results for the signed-in user and the guest slot. */
export function clearBuildDemoUploadResultsOnLogout(
  userEmail?: string | null,
): void {
  clearBuildDemoUploadResultForUser(userEmail);
  clearBuildDemoUploadResultForUser(null);
}

export function loadPersistedBuildDemoUploadResult(
  storageKey: string,
): PersistedBuildDemoUploadResult | null {
  const storage = uploadResultStorage();
  if (!storage) return null;
  removeLegacyLocalStorageUploadResult(storageKey);
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedBuildDemoUploadResult>;
    const out: PersistedBuildDemoUploadResult = {
      sftpUploadPopupPayload: null,
      lastSuccessfulSftpUpload: null,
    };
    const popup = parsed.sftpUploadPopupPayload;
    if (
      popup &&
      typeof popup === "object" &&
      typeof (popup as { targetPath?: unknown }).targetPath === "string" &&
      typeof (popup as { remoteBase?: unknown }).remoteBase === "string"
    ) {
      out.sftpUploadPopupPayload = popup;
    }
    const last = parsed.lastSuccessfulSftpUpload;
    if (
      last &&
      typeof last === "object" &&
      typeof (last as { remoteBase?: unknown }).remoteBase === "string" &&
      typeof (last as { targetPath?: unknown }).targetPath === "string"
    ) {
      out.lastSuccessfulSftpUpload = last;
    }
    if (!out.sftpUploadPopupPayload && !out.lastSuccessfulSftpUpload) {
      return null;
    }
    return out;
  } catch {
    try {
      storage.removeItem(storageKey);
    } catch {
      // ignore
    }
    return null;
  }
}

export function persistBuildDemoUploadResult(
  storageKey: string,
  data: PersistedBuildDemoUploadResult,
): void {
  const storage = uploadResultStorage();
  if (!storage) return;
  if (!data.sftpUploadPopupPayload && !data.lastSuccessfulSftpUpload) {
    try {
      storage.removeItem(storageKey);
    } catch {
      // ignore
    }
    return;
  }
  try {
    storage.setItem(storageKey, JSON.stringify(data));
  } catch {
    // quota exceeded or private mode
  }
}
