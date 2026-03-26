import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  const role = (user?.role || "").toLowerCase();
  const guestAllowedPaths = new Set([
    "/manage-demo",
    "/creative-showcase",
    "/chat",
  ]);
  if (role === "guest" && !guestAllowedPaths.has(location.pathname)) {
    return <Navigate to="/creative-showcase" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
