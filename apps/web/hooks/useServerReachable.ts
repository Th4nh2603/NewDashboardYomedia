import { useEffect, useState } from "react";
import {
  getAdminOfflineMode,
  subscribeAdminOfflineMode,
} from "../lib/adminOfflineMode";
import { api } from "../lib/trpc/api";

const POLL_MS = 15000;

/**
 * Tracks whether the API responds to tRPC health.check (no auth).
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
      try {
        const result = await api.health.check();
        if (!cancelled) setReachable(result.ok === true);
      } catch {
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
