import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
  name: string;
  email: string;
  picture?: string;
  role?: string;
  roleTitle?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User, options?: { remember?: boolean }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const isAuthenticated = !!user;
  const getServerBaseUrl = () =>
    (import.meta.env as any).VITE_SERVER_URL || "http://localhost:3001";

  useEffect(() => {
    let cancelled = false;
    try {
      const stored = window.localStorage.getItem("yomedia-auth-user");
      if (stored) {
        const parsed = JSON.parse(stored) as User;
        if (parsed && parsed.email) {
          setUser(parsed);
          void (async () => {
            try {
              const res = await fetch(
                `${getServerBaseUrl()}/api/account-profile?email=${encodeURIComponent(parsed.email)}`,
              );
              const data = await res.json().catch(() => ({}));
              if (!res.ok || !data?.ok || !data?.user || cancelled) return;

              const refreshedUser: User = {
                ...parsed,
                name: data.user.name || parsed.name,
                email: data.user.email || parsed.email,
                role: data.user.role || parsed.role,
                roleTitle: data.user.roleTitle || parsed.roleTitle,
              };
              setUser(refreshedUser);
              window.localStorage.setItem(
                "yomedia-auth-user",
                JSON.stringify(refreshedUser),
              );
            } catch {
              // keep stored user when profile refresh fails
            }
          })();
        }
      }
    } catch {
      // ignore storage errors
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const login = (userData: User, options?: { remember?: boolean }) => {
    setUser(userData);
    if (options?.remember) {
      try {
        window.localStorage.setItem("yomedia-auth-user", JSON.stringify(userData));
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
    try {
      window.localStorage.removeItem("yomedia-auth-user");
    } catch {
      // ignore storage errors
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
