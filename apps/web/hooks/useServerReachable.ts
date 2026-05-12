import { useEffect, useState } from "react";
import {
  getAdminOfflineMode,
  subscribeAdminOfflineMode,
} from "../lib/adminOfflineMode";
import { serverApiOrigin } from "../lib/serverApiOrigin";

const POLL_MS = 15000;

/**
 * Tracks whether the Express API responds to GET /api/health (no auth).
 */
export function useServerReachable(): boolean {
  const [reachable, setReachable] = useState(() => !getAdminOfflineMode());

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (getAdminOfflineMode()) {
        if (!cancelled) setReachable(false);
        return;
      }
      const base = serverApiOrigin();
      const url = `${base}/api/health`;
      const ctrl = new AbortController();
      const t = window.setTimeout(() => ctrl.abort(), 8000);
      try {
        const res = await fetch(url, {
          method: "GET",
          signal: ctrl.signal,
          cache: "no-store",
        });
        clearTimeout(t);
        if (!cancelled) setReachable(res.ok);
      } catch {
        clearTimeout(t);
        if (!cancelled) setReachable(false);
      }
    };

    void check();
    const id = window.setInterval(check, POLL_MS);
    const unsub = subscribeAdminOfflineMode(() => {
      void check();
    });
    return () => {
      cancelled = true;
      window.clearInterval(id);
      unsub();
    };
  }, []);

  return reachable;
}
