import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/stores/AuthContext";
import { useAuth as useClerkAuth } from "@clerk/react";
import {
  buildAccessContext,
  canAccessRoute,
  PUBLIC_ROUTES,
} from "@/utils/access";

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { user, isAuthenticated, authReady } = useAuth();
  const { isSignedIn, isLoaded } = useClerkAuth();
  const location = useLocation();

  if (PUBLIC_ROUTES.has(location.pathname)) {
    return <>{children}</>;
  }

  if (!authReady || !isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  if (!isAuthenticated) {
    return null;
  }

  const ctx = buildAccessContext(user);
  const normalizedPath = location.pathname || "/";
  if (!canAccessRoute(ctx, normalizedPath)) {
    return <Navigate to={ctx.defaultAllowedRoute} replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
