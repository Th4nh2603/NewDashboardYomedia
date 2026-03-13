import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { jwtDecode } from "jwt-decode";

// 1. Định nghĩa cấu trúc dữ liệu User từ Google
interface GoogleUser {
  sub: string; // ID duy nhất của user
  name: string;
  email: string;
  picture: string;
  iat: number;
  exp: number;
}

// 2. Định nghĩa các giá trị mà Context sẽ cung cấp
interface AuthContextType {
  user: GoogleUser | null;
  login: (credentialResponse: any) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Failed to parse user:", error);
      }
    }
    setLoading(false);
  }, []);

  const login = (credentialResponse: any) => {
    if (credentialResponse.credential) {
      const decoded = jwtDecode<GoogleUser>(credentialResponse.credential);
      setUser(decoded);
      localStorage.setItem("user", JSON.stringify(decoded));
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// 3. Hook tùy chỉnh với kiểm tra lỗi Null
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
