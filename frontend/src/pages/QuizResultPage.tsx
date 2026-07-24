import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Trophy,
  ArrowRight,
  Sparkles,
  BookOpen,
  Volume2,
  Image as ImageIcon,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { homePathFor } from "../lib/homePath";

interface AssessmentAttempt {
  textEngagement: number;
  audioEngagement: number;
  visualEngagement: number;
  preferredMode: "TEXT" | "AUDIO" | "VISUAL" | "AR";
}

export const QuizResultPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    refreshUser();
  }, []);

  const quizScore = location.state?.score ?? 0;
  const totalQuestions = location.state?.total ?? 0;
  const attempt: AssessmentAttempt | null = location.state?.attempt ?? null;

  const profile = {
    text: Math.round(attempt?.textEngagement ?? 0),
    audio: Math.round(attempt?.audioEngagement ?? 0),
    visual: Math.round(attempt?.visualEngagement ?? 0),
    recommended: attempt?.preferredMode ?? "TEXT",
  };

  const getModeDetails = (mode: string) => {
    switch (mode) {
      case "VISUAL":
        return {
          icon: ImageIcon,
          color: "bg-emerald-100 text-emerald-800",
          text: "text-emerald-700",
          label: "Visual Mode",
          desc: "You process information best when presented with images, spatial diagrams, and visual cues.",
        };
      case "AUDIO":
        return {
          icon: Volume2,
          color: "bg-sky-100 text-sky-800",
          text: "text-sky-700",
          label: "Audio Mode",
          desc: "You learn best through clear listening, gentle voice narration, and auditory repetition.",
        };
      default:
        return {
          icon: BookOpen,
          color: "bg-amber-100 text-amber-800",
          text: "text-amber-700",
          label: "Text Mode",
          desc: "You excel at reading and processing structured, distraction-free written text.",
        };
    }
  };

  const recommended = getModeDetails(profile.recommended);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#FAF9F5] text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900 py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center"
    >
      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="w-20 h-20 bg-amber-100 text-amber-700 border border-amber-200 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm"
          >
            <Trophy className="w-10 h-10" />
          </motion.div>
          <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-2">
            Free Trial Completed!
          </h1>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-bold text-sm mb-3">
            <span>1 of 1 Free Adaptive Session Used</span>
          </div>
          <p className="text-base text-slate-600 max-w-xl mx-auto">
            Quiz Score:{" "}
            <strong className="text-slate-900 font-bold">
              {quizScore} / {totalQuestions} Correct
            </strong>{" "}
            (
            {totalQuestions > 0
              ? Math.round((quizScore / totalQuestions) * 100)
              : 0}
            %).
          </p>
          {!attempt && (
            <div className="mt-3 inline-flex items-center gap-2 text-amber-800 text-xs bg-amber-50 border border-amber-200 px-4 py-2 rounded-full font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Saved to your
              device profile.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Breakdown */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between"
          >
            <h3 className="text-xl font-bold text-slate-900 mb-6">
              Engagement Breakdown
            </h3>
            <div className="space-y-6">
              {[
                {
                  label: "Visual",
                  value: profile.visual,
                  barColor: "bg-emerald-500",
                  icon: ImageIcon,
                },
                {
                  label: "Audio",
                  value: profile.audio,
                  barColor: "bg-sky-500",
                  icon: Volume2,
                },
                {
                  label: "Text",
                  value: profile.text,
                  barColor: "bg-amber-500",
                  icon: BookOpen,
                },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="flex items-center text-sm font-bold text-slate-700">
                      <item.icon className="w-4 h-4 mr-2 text-slate-400" />
                      {item.label}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {item.value}%
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 1, delay: 0.3 + i * 0.15 }}
                      className={`h-full ${item.barColor} rounded-full`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recommendation & Payment Prompt */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-4">
                <span>Recommended Learning Profile</span>
              </div>

              <div className="flex items-center space-x-4 mb-4">
                <div
                  className={`p-4 rounded-2xl ${recommended.color} border border-emerald-200 shrink-0`}
                >
                  <recommended.icon className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {recommended.label}
                </h2>
              </div>

              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Based on your attention signals,{" "}
                {recommended.desc.toLowerCase()}
              </p>

              {!user?.hasPaid && (
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 mb-6 text-xs text-emerald-900 space-y-1.5">
                  <div className="flex items-center font-bold text-emerald-800 gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>eSewa Subscription Required for Dashboard</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Your single free trial is now complete. Subscribe using
                    eSewa to unlock your full student dashboard, personalized
                    RAG lessons, and AR games!
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {!user?.hasPaid ? (
                <button
                  onClick={() => navigate("/subscription")}
                  className="w-full bg-[#60BB46] hover:bg-[#52a33c] text-white font-bold py-3.5 px-6 rounded-2xl shadow-md border-b-4 border-[#438a30] active:translate-y-0.5 active:border-b-2 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <span>Subscribe with eSewa to Unlock Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => navigate(homePathFor(user))}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <span>Go to Full Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default QuizResultPage;
