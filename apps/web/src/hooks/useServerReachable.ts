import { useEffect, useState } from "react";
import {
  getAdminOfflineMode,
  getApiOfflineMode,
  reportHealthProbeFailure,
  reportHealthProbeSuccess,
  subscribeAdminOfflineMode,
} from "@/utils/adminOfflineMode";
import { api } from "@/api/trpc/api";
import { isBackendRequestError } from "@/api/apiError";

const POLL_MS = 15000;

/**
 * Tracks whether the API responds to tRPC health.check (no auth).
 * Drives auto-offline when probes fail and clears it when the API recovers.
 */
export function useServerReachable(): boolean {
  const [reachable, setReachable] = useState(() => !getApiOfflineMode());

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (getAdminOfflineMode()) {
        if (!cancelled) setReachable(false);
        return;
      }

      try {
        const result = await api.health.check();
        const ok = result.ok === true;
        if (!cancelled) setReachable(ok);
        if (ok) reportHealthProbeSuccess();
        else reportHealthProbeFailure();
      } catch (err) {
        if (!cancelled) setReachable(false);
        if (
          isBackendRequestError(err) &&
          (err.status === 0 ||
            err.status >= 502 ||
            err.code === "NETWORK_ERROR")
        ) {
          reportHealthProbeFailure();
        }
      }
    };

    void check();
    const id = window.setInterval(check, POLL_MS);
    const unsub = subscribeAdminOfflineMode(() => {
      if (!cancelled) setReachable(!getApiOfflineMode());
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
