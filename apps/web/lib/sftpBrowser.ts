import { backendErrorFromResponse } from "./apiError";

export type SftpEntry = {
  name: string;
  type: string;
  size: number;
  modifyTime?: number;
};

export type SftpSearchMatch = {
  fullPath: string;
  relativePath: string;
  matchedName: string;
};

export function getServerBaseUrl(): string {
  return import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
}

export function sortSftpEntries(list: SftpEntry[]): SftpEntry[] {
  const filtered = list.filter(
    (entry) => !entry.name.startsWith(".") && !entry.name.startsWith(".bash"),
  );
  return filtered.slice().sort((a, b) => {
    const isDirA = a.type === "d";
    const isDirB = b.type === "d";
    if (isDirA && !isDirB) return -1;
    if (!isDirA && isDirB) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function getParentPath(path: string): string | null {
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
  if (trimmed === "/" || trimmed === "") return null;
  const lastSlash = trimmed.lastIndexOf("/");
  if (lastSlash <= 0) return "/";
  return trimmed.slice(0, lastSlash) || "/";
}

export function joinPath(base: string, name: string): string {
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return normalizedBase === "/" ? `/${name}` : `${normalizedBase}/${name}`;
}

export async function fetchSftpList(path: string): Promise<SftpEntry[]> {
  const baseUrl = getServerBaseUrl();
  const res = await fetch(
    `${baseUrl}/api/sftp/list?path=${encodeURIComponent(path)}`,
  );
  if (!res.ok) {
    throw await backendErrorFromResponse(res);
  }
  const data = (await res.json()) as {
    ok?: boolean;
    entries?: SftpEntry[];
    error?: string;
  };
  if (!data.ok) {
    throw new Error(data.error || `Unable to list ${path}`);
  }
  return sortSftpEntries(Array.isArray(data.entries) ? data.entries : []);
}

export async function fetchSftpSearch(
  path: string,
  query: string,
): Promise<SftpSearchMatch[]> {
  const baseUrl = getServerBaseUrl();
  const res = await fetch(
    `${baseUrl}/api/sftp/search-directories?path=${encodeURIComponent(path)}&q=${encodeURIComponent(query)}`,
  );
  if (!res.ok) {
    throw await backendErrorFromResponse(res);
  }
  const data = (await res.json()) as {
    ok?: boolean;
    matches?: SftpSearchMatch[];
    error?: string;
  };
  if (!data.ok) {
    throw new Error(data.error || "Tìm thư mục thất bại");
  }
  return Array.isArray(data.matches) ? data.matches : [];
}
