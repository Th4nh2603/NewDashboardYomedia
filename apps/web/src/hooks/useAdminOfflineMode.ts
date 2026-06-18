import { useCallback, useEffect, useState } from "react";
import {
  getAdminOfflineMode,
  getApiOfflineMode,
  getAutoApiOfflineMode,
  setAdminOfflineMode,
  subscribeAdminOfflineMode,
} from "@/utils/adminOfflineMode";

export function useAdminOfflineMode() {
  const [manual, setManual] = useState(getAdminOfflineMode);
  const [auto, setAuto] = useState(getAutoApiOfflineMode);

  useEffect(
    () =>
      subscribeAdminOfflineMode(() => {
        setManual(getAdminOfflineMode());
        setAuto(getAutoApiOfflineMode());
      }),
    [],
  );

  const toggle = useCallback(() => {
    setAdminOfflineMode(!getAdminOfflineMode());
  }, []);

  return {
    /** Manual or auto-detected offline (drives Build Demo / fetch gate). */
    enabled: manual || auto,
    manual,
    auto,
    toggle,
    setOffline: setAdminOfflineMode,
  };
}
