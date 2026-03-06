
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { SparklesIcon, LockClosedIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      login();
      setIsLoading(false);
      navigate('/');
    }, 1500);
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
                scale: [1, 1.1, 1]
              }}
              transition={{ repeat: Infinity, duration: 5 }}
              className="w-16 h-16 bg-[#4cceac]/20 rounded-2xl flex items-center justify-center mb-6 border border-[#4cceac]/30"
            >
              <SparklesIcon className="w-8 h-8 text-[#4cceac]" />
            </motion.div>
            <h1 className="text-3xl font-bold text-[#e0e0e0] tracking-tight">Welcome Back</h1>
            <p className="text-[#a3a3a3] mt-2 font-medium">Sign in to Nova AI Suite</p>
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
                <input type="checkbox" className="w-4 h-4 rounded border-[#3d465d] bg-[#141b2d] text-[#4cceac] focus:ring-[#4cceac]/50" />
                <span className="text-sm text-[#a3a3a3] group-hover:text-[#e0e0e0] transition-colors">Remember me</span>
              </label>
              <button type="button" className="text-sm text-[#4cceac] hover:text-[#3da58a] font-semibold transition-colors">
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
          </form>

          <div className="mt-8 flex flex-col gap-4">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#3d465d]/50"></div>
              </div>
              <span className="relative px-4 bg-[#1f2a40] text-[#a3a3a3] text-xs font-bold uppercase tracking-widest">
                or
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => {
                  login();
                  setIsLoading(false);
                  navigate('/');
                }, 1000);
              }}
              className="w-full bg-white/5 hover:bg-white/10 text-[#e0e0e0] font-bold py-4 rounded-2xl transition-all border border-white/5 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="mt-10 text-center">
            <p className="text-[#a3a3a3] text-sm">
              Don't have an account?{" "}
              <button className="text-[#4cceac] font-bold hover:underline">Create one</button>
            </p>
          </div>
        </div>
        
        <p className="text-center text-[#3d465d] text-xs mt-8 font-medium uppercase tracking-widest">
          &copy; 2026 Nova AI Creative Suite
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
