import { useCallback, useEffect, useState } from "react";
import {
  getAdminOfflineMode,
  setAdminOfflineMode,
  subscribeAdminOfflineMode,
} from "../lib/adminOfflineMode";

export function useAdminOfflineMode() {
  const [enabled, setEnabled] = useState(getAdminOfflineMode);

  useEffect(
    () => subscribeAdminOfflineMode(() => setEnabled(getAdminOfflineMode())),
    [],
  );

  const toggle = useCallback(() => {
    setAdminOfflineMode(!getAdminOfflineMode());
  }, []);

  return { enabled, toggle, setOffline: setAdminOfflineMode };
}
