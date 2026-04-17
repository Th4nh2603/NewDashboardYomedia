import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { useError } from "../contexts/ErrorContext";
import { BackendRequestError } from "../lib/apiError";
import {
  SparklesIcon,
  LockClosedIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const { handleApiError } = useError();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const baseUrl =
        (import.meta.env as any).VITE_SERVER_URL || "http://localhost:3001";

      const response = await fetch(`${baseUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok || !data.user) {
        window.alert(data.error || "Invalid email or password");
        setIsLoading(false);
        return;
      }

      login(
        {
          name: data.user.name || email || "User",
          email: data.user.email || email,
          picture: undefined,
          role: data.user.role,
          roleTitle: data.user.roleTitle,
        },
        { remember: rememberMe },
      );
      navigate("/");
    } catch (err) {
      handleApiError(err, "Login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const baseUrl =
      (import.meta.env as any).VITE_SERVER_URL || "http://localhost:3001";
    window.location.href = `${baseUrl}/api/auth/google`;
  };

  return (
    <div className="min-h-screen bg-[#141b2d] flex items-center justify-center p-6 font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#4cceac]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-[#1f2a40]/80 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <div className="flex flex-col items-center mb-10">
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{ repeat: Infinity, duration: 5 }}
              className="w-16 h-16 bg-[#4cceac]/20 rounded-2xl flex items-center justify-center mb-6 border border-[#4cceac]/30"
            >
              <SparklesIcon className="w-8 h-8 text-[#4cceac]" />
            </motion.div>
            <h1 className="text-3xl font-bold text-[#e0e0e0] tracking-tight">
              Welcome Back
            </h1>
            <p className="text-[#a3a3a3] mt-2 font-medium">
              Sign in to YomediaAI Suite
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-widest ml-1">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <EnvelopeIcon className="w-5 h-5 text-[#3d465d] group-focus-within:text-[#4cceac] transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-[#141b2d] border border-[#3d465d] rounded-2xl py-4 pl-12 pr-4 text-[#e0e0e0] focus:border-[#4cceac]/50 outline-none transition-all placeholder-[#3d465d]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#a3a3a3] uppercase tracking-widest ml-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <LockClosedIcon className="w-5 h-5 text-[#3d465d] group-focus-within:text-[#4cceac] transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#141b2d] border border-[#3d465d] rounded-2xl py-4 pl-12 pr-4 text-[#e0e0e0] focus:border-[#4cceac]/50 outline-none transition-all placeholder-[#3d465d]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-[#3d465d] bg-[#141b2d] text-[#4cceac] focus:ring-[#4cceac]/50"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="text-sm text-[#a3a3a3] group-hover:text-[#e0e0e0] transition-colors">
                  Remember me
                </span>
              </label>
              <button
                type="button"
                className="text-sm text-[#4cceac] hover:text-[#3da58a] font-semibold transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#4cceac] hover:bg-[#3da58a] disabled:bg-[#3d465d] text-[#141b2d] font-bold py-4 rounded-2xl transition-all shadow-lg shadow-[#4cceac]/20 flex items-center justify-center gap-2 mt-8"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-5 h-5 border-2 border-[#141b2d] border-t-transparent rounded-full"
                />
              ) : (
                "Sign In"
              )}
            </button>

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#3d465d]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#1f2a40]/80 px-3 text-[#a3a3a3] font-semibold tracking-widest">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-[#141b2d] hover:bg-[#25304b] border border-[#3d465d] text-[#e0e0e0] font-semibold py-4 rounded-2xl transition-all flex items-center justify-center gap-3"
            >
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white text-[#141b2d] font-bold text-sm">
                G
              </span>
              Sign in with Google
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-[#a3a3a3] text-sm">
              Don't have an account?{" "}
              <button className="text-[#4cceac] font-bold hover:underline">
                Create one
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-[#3d465d] text-xs mt-8 font-medium uppercase tracking-widest">
          &copy; 2026 YomediaAI Creative Suite
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
