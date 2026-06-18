import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/react";
import { api } from "@/api/trpc/api";
import { rememberClerkToken } from "@/api/apiAuth";
import { setAdminOfflineMode } from "@/utils/adminOfflineMode";
import { clearBuildDemoUploadResultsOnLogout } from "@/utils/buildDemoUploadResultStorage";

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

type AuthSessionUser = {
  name?: string;
  email?: string;
  imageUrl?: string;
  role?: string;
  roleTitle?: string;
  allowedRoutes?: string[];
  allowedBuildDemoBrands?: string[] | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readAuthSessionUser(value: unknown): AuthSessionUser | null {
  if (!isRecord(value)) return null;
  const user = value.user;
  if (!isRecord(user)) return null;
  return {
    name: typeof user.name === "string" ? user.name : undefined,
    email: typeof user.email === "string" ? user.email : undefined,
    imageUrl: typeof user.imageUrl === "string" ? user.imageUrl : undefined,
    role: typeof user.role === "string" ? user.role : undefined,
    roleTitle: typeof user.roleTitle === "string" ? user.roleTitle : undefined,
    allowedRoutes: Array.isArray(user.allowedRoutes)
      ? user.allowedRoutes.filter((route): route is string => typeof route === "string")
      : undefined,
    allowedBuildDemoBrands:
      user.allowedBuildDemoBrands === null
        ? null
        : Array.isArray(user.allowedBuildDemoBrands)
          ? user.allowedBuildDemoBrands.filter(
              (brand): brand is string => typeof brand === "string",
            )
          : undefined,
  };
}

function buildClerkFallbackUser(
  clerkUser: NonNullable<ReturnType<typeof useUser>["user"]>,
): User {
  return {
    name:
      clerkUser.fullName ||
      clerkUser.firstName ||
      clerkUser.username ||
      "User",
    email: clerkUser.primaryEmailAddress?.emailAddress || "",
    picture: clerkUser.imageUrl,
    role: "guest",
    roleTitle: "Guest",
    allowedRoutes: ["/", "/chat", "/creative", "/documentation"],
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const { isSignedIn, signOut, getToken, isLoaded: clerkAuthLoaded } =
    useClerkAuth();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const isAuthenticated = !!user;

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
      const clerkFallbackUser =
        isSignedIn && clerkUser ? buildClerkFallbackUser(clerkUser) : null;
      let hasApiAuth = false;

      if (isSignedIn) {
        try {
          const clerkJwt = await getToken();
          rememberClerkToken(clerkJwt);
          if (clerkJwt) {
            hasApiAuth = true;
            const sessionUser = readAuthSessionUser(await api.auth.session());

            if (sessionUser) {
              nextUser = {
                name:
                  sessionUser.name ||
                  nameFromClerk ||
                  nextUser?.name ||
                  "User",
                email:
                  sessionUser.email ||
                  emailFromClerk ||
                  nextUser?.email ||
                  "",
                picture:
                  sessionUser.imageUrl ||
                  clerkUser?.imageUrl ||
                  nextUser?.picture,
                role: sessionUser.role || nextUser?.role,
                roleTitle: sessionUser.roleTitle || nextUser?.roleTitle,
                allowedRoutes: Array.isArray(sessionUser.allowedRoutes)
                  ? sessionUser.allowedRoutes
                  : Array.isArray(nextUser?.allowedRoutes)
                    ? nextUser.allowedRoutes
                    : [],
                allowedBuildDemoBrands:
                  sessionUser.allowedBuildDemoBrands !== undefined
                    ? sessionUser.allowedBuildDemoBrands
                    : nextUser?.allowedBuildDemoBrands,
              };
            }
          }
        } catch {
          nextUser = nextUser ?? clerkFallbackUser;
        }
      }

      nextUser = nextUser ?? clerkFallbackUser;

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

      if (!hasApiAuth) {
        if (!cancelled) {
          setUser(nextUser);
          setAuthReady(true);
        }
        return;
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
    clearBuildDemoUploadResultsOnLogout(user?.email);
    rememberClerkToken(null);
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
