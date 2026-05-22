import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/react";
import { fetchJsonOrThrow } from "../lib/apiError";
import { setAdminOfflineMode } from "../lib/adminOfflineMode";
import { serverApiOrigin } from "../lib/serverApiOrigin";

interface User {
  name: string;
  email: string;
  picture?: string;
  role?: string;
  roleTitle?: string;
  allowedRoutes?: string[];
  /** Resolved list; null = all brands (admin / unrestricted). */
  allowedBuildDemoBrands?: string[] | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  authReady: boolean;
  login: (user: User, options?: { remember?: boolean }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const { isSignedIn, signOut, getToken, isLoaded: clerkAuthLoaded } =
    useClerkAuth();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const isAuthenticated = !!user;
  const getServerBaseUrl = () => serverApiOrigin();

  useEffect(() => {
    if (!authReady) return;
    const r = user?.role?.trim().toLowerCase();
    if (!user || r !== "admin") {
      setAdminOfflineMode(false);
    }
  }, [user, authReady]);

  useEffect(() => {
    let cancelled = false;

    const hydrateAuthState = async () => {
      if (!isClerkLoaded || !clerkAuthLoaded) return;
      let nextUser: User | null = null;

      try {
        const stored = window.localStorage.getItem("yomedia-auth-user");
        if (stored) {
          const parsed = JSON.parse(stored) as User;
          if (parsed?.email) {
            nextUser = parsed;
          }
        }
      } catch {
        // ignore storage errors
      }

      const emailFromClerk = clerkUser?.primaryEmailAddress?.emailAddress || "";
      const nameFromClerk =
        clerkUser?.fullName ||
        clerkUser?.firstName ||
        clerkUser?.username ||
        "";

      if (isSignedIn) {
        try {
          const clerkJwt = await getToken();
          if (clerkJwt) {
            const clerkProfile = await fetchJsonOrThrow<{
              ok?: boolean;
              user?: {
                id?: string;
                name?: string;
                firstName?: string;
                lastName?: string;
                username?: string;
                email?: string;
                imageUrl?: string;
              };
            }>(`${getServerBaseUrl()}/api/user/me`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${clerkJwt}`,
              },
            });

            if (clerkProfile?.ok && clerkProfile?.user) {
              nextUser = {
                name:
                  clerkProfile.user.name ||
                  nameFromClerk ||
                  nextUser?.name ||
                  "User",
                email:
                  clerkProfile.user.email ||
                  emailFromClerk ||
                  nextUser?.email ||
                  "",
                picture:
                  clerkProfile.user.imageUrl ||
                  clerkUser?.imageUrl ||
                  nextUser?.picture,
                role: nextUser?.role,
                roleTitle: nextUser?.roleTitle,
                allowedRoutes: Array.isArray(nextUser?.allowedRoutes)
                  ? nextUser?.allowedRoutes
                  : [],
              };
            }
          }
        } catch {
          // fallback to current Clerk client + local data
        }
      }

      const emailToLookup = nextUser?.email || emailFromClerk || "";

      if (!cancelled && nextUser) {
        setUser(nextUser);
      }

      if (!emailToLookup) {
        if (!cancelled) {
          setUser(isSignedIn && clerkUser ? nextUser : null);
          setAuthReady(true);
        }
        return;
      }

      try {
        const data = await fetchJsonOrThrow<{
          ok?: boolean;
          user?: {
            name?: string;
            email?: string;
            role?: string;
            roleTitle?: string;
            allowedRoutes?: string[];
            allowedBuildDemoBrands?: string[] | null;
          };
        }>(`${getServerBaseUrl()}/api/auth/me`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailToLookup, name: nameFromClerk }),
        });

        if (data?.ok && data?.user) {
          nextUser = {
            name: data.user.name || nameFromClerk || nextUser?.name || "User",
            email: data.user.email || emailToLookup,
            picture: clerkUser?.imageUrl || nextUser?.picture,
            role: data.user.role || nextUser?.role,
            roleTitle: data.user.roleTitle || nextUser?.roleTitle,
            allowedRoutes: Array.isArray(data.user.allowedRoutes)
              ? data.user.allowedRoutes
              : [],
            allowedBuildDemoBrands: Array.isArray(data.user.allowedBuildDemoBrands)
              ? data.user.allowedBuildDemoBrands
              : data.user.allowedBuildDemoBrands === null
                ? null
                : nextUser?.allowedBuildDemoBrands,
          };
        } else if (isSignedIn && clerkUser && emailFromClerk) {
          nextUser = {
            name: nameFromClerk || "User",
            email: emailFromClerk,
            picture: clerkUser.imageUrl,
            role: "guest",
            roleTitle: "Guest",
            allowedRoutes: [],
          };
        }
      } catch {
        // keep current user data when sync fails
      }

      if (!cancelled) {
        setUser(nextUser);
        setAuthReady(true);
      }

      try {
        if (nextUser) {
          window.localStorage.setItem(
            "yomedia-auth-user",
            JSON.stringify(nextUser),
          );
        } else {
          window.localStorage.removeItem("yomedia-auth-user");
        }
      } catch {
        // ignore storage errors
      }
    };

    void hydrateAuthState();
    return () => {
      cancelled = true;
    };
  }, [isClerkLoaded, clerkAuthLoaded, isSignedIn, clerkUser, getToken]);

  const login = (userData: User, options?: { remember?: boolean }) => {
    setUser(userData);
    setAuthReady(true);
    if (options?.remember) {
      try {
        window.localStorage.setItem(
          "yomedia-auth-user",
          JSON.stringify(userData),
        );
      } catch {
        // ignore storage errors
      }
    } else {
      try {
        window.localStorage.removeItem("yomedia-auth-user");
      } catch {
        // ignore storage errors
      }
    }
  };

  const logout = () => {
    setUser(null);
    setAuthReady(true);
    try {
      window.localStorage.removeItem("yomedia-auth-user");
    } catch {
      // ignore storage errors
    }
    void signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, authReady, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
