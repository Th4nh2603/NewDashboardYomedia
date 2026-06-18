import { useMemo } from "react";
import { useAuth } from "@/stores/AuthContext";
import {
  buildAccessContext,
  canAccess,
  canAccessAction,
  canAccessRoute,
  canShowNavRoute,
  type AccessAction,
  type AccessContext,
} from "@/utils/access";

export function useAccessContext(): AccessContext {
  const { user } = useAuth();
  return useMemo(() => buildAccessContext(user), [user]);
}

/** Check route path or named action (`admin`, `adminOfflineMode`). */
export function useCanAccess(routeOrAction: string): boolean {
  const ctx = useAccessContext();
  return useMemo(
    () => canAccess(ctx, routeOrAction),
    [ctx, routeOrAction],
  );
}

export function useCanAccessRoute(path: string): boolean {
  const ctx = useAccessContext();
  return useMemo(() => canAccessRoute(ctx, path), [ctx, path]);
}

export function useCanShowNavRoute(path: string): boolean {
  const ctx = useAccessContext();
  return useMemo(() => canShowNavRoute(ctx, path), [ctx, path]);
}

export function useCanAccessAction(action: AccessAction): boolean {
  const ctx = useAccessContext();
  return useMemo(() => canAccessAction(ctx, action), [ctx, action]);
}
