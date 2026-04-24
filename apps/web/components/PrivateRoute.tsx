import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAuth as useClerkAuth } from "@clerk/react";

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, authReady } = useAuth();
  const { isSignedIn, isLoaded } = useClerkAuth();
  const location = useLocation();
  const publicPaths = new Set(["/creative-showcase"]);

  if (publicPaths.has(location.pathname)) {
    return <>{children}</>;
  }

  if (!authReady || !isLoaded) {
    return null;
  }

  if (!isAuthenticated && !isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
