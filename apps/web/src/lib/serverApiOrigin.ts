/**
 * Origin for the Express API (default local port 3001).
 * In Vite dev, returns "" so fetches hit the web origin and `/api` is proxied to the server.
 */
export function serverApiOrigin(): string {
  // Dev: always use same-origin `/api` (Vite proxy → local Express).
  if (import.meta.env.DEV) return "";
  const raw =
    typeof import.meta.env.VITE_SERVER_URL === "string"
      ? import.meta.env.VITE_SERVER_URL.trim()
      : "";
  if (raw) return raw.replace(/\/+$/, "");
  return "http://localhost:3001";
}

/** Build `/api/...` URL; in dev uses same-origin relative path for Vite proxy. */
export function serverApiUrl(pathAndQuery: string): string {
  const path = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  const base = serverApiOrigin();
  return base ? `${base}${path}` : path;
}
