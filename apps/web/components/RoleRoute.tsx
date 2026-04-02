import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface RoleRouteProps {
  children: React.ReactNode;
  allow?: string[];
  deny?: string[];
}

const RoleRoute: React.FC<RoleRouteProps> = ({ children, allow = [], deny = [] }) => {
  const { user } = useAuth();
  const role = (user?.role || "").trim().toLowerCase();
  const allowedRoles = new Set(allow.map((item) => item.trim().toLowerCase()));
  const deniedRoles = new Set(deny.map((item) => item.trim().toLowerCase()));

  if (deniedRoles.has(role)) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles.size > 0 && !allowedRoles.has(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;
