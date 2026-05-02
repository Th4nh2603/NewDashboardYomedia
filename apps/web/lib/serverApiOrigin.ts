/**
 * Origin for the Express API (default local port 3001).
 * In Vite dev, returns "" so fetches hit the web origin and `/api` is proxied to the server.
 */
export function serverApiOrigin(): string {
  const raw =
    typeof import.meta.env.VITE_SERVER_URL === "string"
      ? import.meta.env.VITE_SERVER_URL.trim()
      : "";
  if (raw) return raw.replace(/\/+$/, "");
  if (import.meta.env.DEV) return "";
  return "http://localhost:3001";
}
