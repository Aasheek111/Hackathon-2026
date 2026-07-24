import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return { score: 0, text: "", color: "bg-slate-300" };
    if (pass.length > 6) score += 1;
    if (pass.length > 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 25, text: "Weak", color: "bg-rose-500" };
    if (score <= 3) return { score: 50, text: "Fair", color: "bg-amber-500" };
    if (score === 4)
      return { score: 75, text: "Strong", color: "bg-emerald-500" };
    return { score: 100, text: "Very Strong", color: "bg-emerald-600" };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password, role);
      navigate(role === "TEACHER" ? "/teacher" : "/consent");
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to register. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-[#FAF9F5] text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900"
    >
      <div className="w-full max-w-4xl flex flex-col lg:flex-row-reverse rounded-3xl overflow-hidden bg-white border border-slate-200/80 shadow-md">
        {/* Visual Side */}
        <div className="lg:w-1/2 bg-gradient-to-br from-amber-50 via-emerald-50/60 to-sky-50 p-8 sm:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-l border-slate-100">
          <div>
            <div className="flex items-center space-x-2 mb-8">
              <img src="/logo.png" alt="Pragya Logo" className="h-12 w-auto object-contain" />
            </div>
            <div className="inline-flex items-center gap-2 bg-white/80 border border-emerald-200/60 px-3 py-1 rounded-full text-xs font-bold text-emerald-800 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Start Your Journey</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
              Personalized education tailored for every mind
            </h1>
          </div>
        </div>

        {/* Form Side */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
              Create Account
            </h2>
            <p className="text-slate-500 text-sm">
              Join NeuroLearn in seconds.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl mb-6 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                I am registering as a...
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("STUDENT")}
                  className={`flex flex-col items-center gap-1.5 p-3.5 rounded-2xl border-2 transition-all text-xs font-bold ${
                    role === "STUDENT"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs"
                      : "border-slate-200 bg-[#FAF9F5] text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  <span>Learner / Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("TEACHER")}
                  className={`flex flex-col items-center gap-1.5 p-3.5 rounded-2xl border-2 transition-all text-xs font-bold ${
                    role === "TEACHER"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs"
                      : "border-slate-200 bg-[#FAF9F5] text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <GraduationCap className="w-5 h-5 text-sky-600" />
                  <span>Educator / Teacher</span>
                </button>
              </div>
              {role === "TEACHER" && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl mt-2 font-medium">
                  Teacher accounts require admin verification before classroom
                  creation.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl pl-11 pr-11 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {password && (
                <div className="mt-1.5">
                  <div className="flex justify-between text-[11px] font-bold mb-1">
                    <span className="text-slate-500">Password strength</span>
                    <span className="text-slate-700">{strength.text}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${strength.score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all flex items-center justify-center gap-2 text-base mt-4"
            >
              <span>{loading ? "Creating Account..." : "Create Account"}</span>
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-emerald-700 font-bold hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RegisterPage;
