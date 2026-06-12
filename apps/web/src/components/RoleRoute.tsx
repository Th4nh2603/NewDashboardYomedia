import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { buildAccessContext, canAccessRoute } from "../lib/access";

interface RoleRouteProps {
  children: React.ReactNode;
  allow?: string[];
  deny?: string[];
}

const RoleRoute: React.FC<RoleRouteProps> = ({
  children,
  allow = [],
  deny = [],
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const ctx = buildAccessContext(user);
  const role = ctx.role;
  const allowedRoles = new Set(allow.map((item) => item.trim().toLowerCase()));
  const deniedRoles = new Set(deny.map((item) => item.trim().toLowerCase()));

  if (deniedRoles.has(role)) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles.size > 0 && !allowedRoles.has(role)) {
    return <Navigate to="/" replace />;
  }

  if (!canAccessRoute(ctx, location.pathname)) {
    return <Navigate to={ctx.defaultAllowedRoute} replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;
