import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Heart, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Input from "../components/ui/Input";
import { homePathFor } from "../lib/homePath";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password, rememberMe);
      if (user.role === "ADMIN" || user.role === "TEACHER") {
        navigate(homePathFor(user));
      } else {
        if (!user.freeTrialUsed) navigate("/consent");
        else if (!user.hasPaid) navigate("/subscription");
        // Disability profile decides WHICH student dashboard - see homePathFor.
        else navigate(homePathFor(user));
      }
    } catch (err: any) {
      if (err.code === "ERR_NETWORK" || !err.response) {
        setError("Cannot connect to server. Please make sure the backend server is running on port 5001.");
      } else {
        setError(
          err.response?.data?.error ||
            err.response?.data?.message ||
            "Invalid email or password. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen w-full flex items-center justify-center p-3 sm:p-5 pt-16 sm:pt-20 pb-6 bg-[#FAF9F5] text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900"
    >
      <div className="w-full max-w-5xl flex flex-col lg:flex-row rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-lg">
        {/* Left Side - Visual Quote */}
        <div className="lg:w-1/2 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-sky-50 p-8 sm:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100">
          <div>
            <div className="flex items-center justify-center lg:justify-start mb-8 -ml-5">
              <img
                src="/logo.png"
                alt="Pragya Logo"
                className="h-20 w-auto object-contain notranslate"
              />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight text-center lg:text-left">
              Welcome back to your safe learning space
            </h1>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-xs border border-emerald-100/80 mt-8">
            <p className="text-sm leading-relaxed text-slate-600 font-medium">
              "Pragya completely changed how my son approaches education. When
              he gets overwhelmed, the shift to visual cards is like magic."
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-9 h-9 shrink-0 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm border border-emerald-200">
                S
              </div>
              <div>
                <p className="font-bold text-xs text-slate-900">
                  Susmita Kunwar
                </p>
                <p className="text-[11px] text-slate-500">
                  Parent of a 7-year-old
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
              Sign In
            </h2>
            <p className="text-slate-500 text-sm">
              Continue your adaptive educational journey.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl mb-6 text-sm font-medium text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email-address" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="email-address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm leading-normal"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl pl-11 pr-11 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm leading-normal"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 flex items-center justify-center"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-600 font-medium">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-emerald-700 font-bold hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all flex items-center justify-center gap-2 text-base mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span>{loading ? "Signing In..." : "Sign In"}</span>
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-slate-500">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-emerald-700 font-bold hover:underline"
            >
              Create one now
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LoginPage;
