import React, { useEffect } from "react";
import {
  isApiHealthProbeUrl,
  isBlockedAdminOfflineFetchTarget,
  reportHealthProbeFailure,
  reportHealthProbeSuccess,
} from "../lib/adminOfflineMode";

function resolveRequestUrl(input: RequestInfo | URL): URL {
  if (typeof input === "string") {
    return new URL(input, window.location.origin);
  }
  if (input instanceof Request) {
    return new URL(input.url);
  }
  return new URL(input.href);
}

/**
 * Wraps {@link fetch} so offline mode rejects dashboard API calls without hitting the network.
 * Health probes still run while auto-offline so connectivity can be re-established.
 */
const AdminOfflineFetchGate: React.FC = () => {
  useEffect(() => {
    const orig = window.fetch.bind(window) as typeof window.fetch;
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (isBlockedAdminOfflineFetchTarget(input)) {
        return Promise.reject(
          Object.assign(
            new Error("Offline mode is enabled; API calls are blocked."),
            { name: "AdminOfflineError" },
          ),
        );
      }

      const url = resolveRequestUrl(input);
      const trackHealth = isApiHealthProbeUrl(url);

      return orig(input, init).then(
        (res) => {
          if (trackHealth) {
            if (res.ok) reportHealthProbeSuccess();
            else if (res.status >= 502) reportHealthProbeFailure();
          }
          return res;
        },
        (err) => {
          if (trackHealth) reportHealthProbeFailure();
          return Promise.reject(err);
        },
      );
    };
    return () => {
      window.fetch = orig;
    };
  }, []);

  return null;
};

export default AdminOfflineFetchGate;
