import React, { useEffect } from "react";
import { isBlockedAdminOfflineFetchTarget } from "../lib/adminOfflineMode";

/**
 * Wraps {@link fetch} so admin offline mode rejects requests to the dashboard API without hitting the network.
 */
const AdminOfflineFetchGate: React.FC = () => {
  useEffect(() => {
    const orig = window.fetch.bind(window) as typeof window.fetch;
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (isBlockedAdminOfflineFetchTarget(input)) {
        return Promise.reject(
          Object.assign(
            new Error("Admin offline mode is enabled; API calls are blocked."),
            { name: "AdminOfflineError" },
          ),
        );
      }
      return orig(input, init);
    };
    return () => {
      window.fetch = orig;
    };
  }, []);

  return null;
};

export default AdminOfflineFetchGate;
