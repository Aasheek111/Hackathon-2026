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
  ShieldCheck,
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
      className="min-h-screen w-full flex items-center justify-center p-3 sm:p-5 pt-16 sm:pt-20 pb-6 bg-[#FAF9F5] text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900"
    >
      <div className="w-full max-w-5xl flex flex-col lg:flex-row rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-lg lg:h-[82vh] lg:max-h-[600px]">
        {/* Visual Info Side - Narrower (35%) */}
        <div className="hidden lg:flex lg:w-[35%] bg-gradient-to-br from-amber-50/70 via-emerald-50/50 to-sky-50 p-6 sm:p-8 flex-col justify-between border-r border-slate-100 h-full">
          <div>
            <div className="flex items-center justify-start mb-6 -ml-4">
              <img
                src="/logo.png"
                alt="Pragya Logo"
                className="h-16 w-auto object-contain notranslate"
              />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 leading-snug mb-3">
              Empowering unique minds, one step at a time.
            </h1>

            <p className="text-slate-600 text-xs leading-relaxed mb-4">
              Join our supportive learning community. Discover custom lesson
              plans that adapt to your visual, auditory, and hands-on learning
              preferences.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-emerald-100/80 flex items-center gap-2.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span>
              Safe & private. Designed for children, families, and schools.
            </span>
          </div>
        </div>

        {/* Form Side - Wider (65%) */}
        <div className="w-full lg:w-[65%] p-6 sm:p-8 flex flex-col justify-center h-full overflow-y-auto lg:overflow-y-auto">
          {/* Mobile Logo */}
          <div className="flex justify-center lg:hidden mb-4">
            <img
              src="/logo.png"
              alt="Pragya Logo"
              className="h-14 w-auto object-contain"
            />
          </div>

          <div className="mb-5 text-center lg:text-left">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-0.5">
              Create Account
            </h2>
            <p className="text-slate-500 text-xs">
              Join NeuroLearn in less than a minute.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-2xl mb-4 text-xs font-medium text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Account Role Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRole("STUDENT")}
                  className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border-2 transition-all text-xs font-bold ${
                    role === "STUDENT"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs"
                      : "border-slate-200 bg-[#FAF9F5] text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Learner / Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("TEACHER")}
                  className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border-2 transition-all text-xs font-bold ${
                    role === "TEACHER"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs"
                      : "border-slate-200 bg-[#FAF9F5] text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>Educator / Teacher</span>
                </button>
              </div>
              {role === "TEACHER" && (
                <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-xl mt-1.5 font-medium">
                  Teacher accounts require verification before classroom setup.
                </p>
              )}
            </div>

            {/* 2-Column Grid for Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-[#FAF9F5] border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-xs leading-normal"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-[#FAF9F5] border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-xs leading-normal"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 2-Column Grid for Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#FAF9F5] border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-xs leading-normal"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 flex items-center justify-center"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#FAF9F5] border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-xs leading-normal"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password Strength Meter */}
            {password && (
              <div className="mt-1">
                <div className="flex justify-between text-[9px] font-bold mb-0.5">
                  <span className="text-slate-500">Password strength:</span>
                  <span className="text-slate-700">{strength.text}</span>
                </div>
                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all flex items-center justify-center gap-1.5 text-sm mt-3 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span>{loading ? "Creating Account..." : "Create Account"}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-500">
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
