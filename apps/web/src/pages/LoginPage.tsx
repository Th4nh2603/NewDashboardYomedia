import React from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/react";
import { recordActivity } from "../lib/activityLog";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();

  React.useEffect(() => {
    if (isSignedIn) {
      navigate("/");
    }
  }, [isSignedIn, navigate]);

  React.useEffect(() => {
    if (!isSignedIn || !clerkUser) return;
    const userEmail = clerkUser.primaryEmailAddress?.emailAddress || "";
    const userName =
      clerkUser.fullName || clerkUser.firstName || clerkUser.username || "";
    const sessionKey = `yomedia-login-activity:${userEmail || userName}`;
    try {
      if (sessionStorage.getItem(sessionKey) === "1") return;
      sessionStorage.setItem(sessionKey, "1");
    } catch {
      // ignore sessionStorage errors
    }
    void recordActivity({
      user: {
        name: userName,
        email: userEmail,
        role: "guest",
      },
      action: "login",
      area: "Auth",
      description: "Signed in",
      target: "/login",
    });
  }, [clerkUser, isSignedIn]);

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
              <span className="text-3xl leading-none" aria-hidden="true">
                ✨
              </span>
            </motion.div>
            <h1 className="text-3xl font-bold text-[#e0e0e0] tracking-tight">
              Welcome Back
            </h1>
            <p className="text-[#a3a3a3] mt-2 font-medium">
              Sign in to NovaAi Suite
            </p>
          </div>

          <div className="space-y-4">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button
                  type="button"
                  className="w-full bg-[#4cceac] hover:bg-[#3da58a] text-[#141b2d] font-bold py-4 rounded-2xl transition-all shadow-lg shadow-[#4cceac]/20 mt-2"
                >
                  Sign In with Clerk
                </Button>
              </SignInButton>

              <SignUpButton mode="modal">
                <Button
                  type="button"
                  className="w-full border border-[#4cceac]/50 text-[#4cceac] hover:bg-[#4cceac]/10 font-bold py-4 rounded-2xl transition-all"
                >
                  Create account
                </Button>
              </SignUpButton>
            </Show>

            <Show when="signed-in">
              <div className="rounded-2xl border border-[#4cceac]/30 bg-[#4cceac]/10 p-4 text-[#e0e0e0] text-sm flex items-center justify-between gap-3">
                <span>You are signed in.</span>
                <UserButton />
              </div>
            </Show>
          </div>
        </div>

        <p className="text-center text-[#3d465d] text-xs mt-8 font-medium uppercase tracking-widest">
          &copy; 2026 NovaAi Creative Suite
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
