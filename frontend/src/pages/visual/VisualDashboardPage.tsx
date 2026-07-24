import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Settings as SettingsIcon,
  Hand,
  ClipboardList,
  Captions,
  Zap,
  Award,
  Flame,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { getStudentNavItems } from "../../lib/nav";
import DashboardShell, { NavItem } from "../../components/DashboardShell";
import AiAssistantPanel from "../../components/AiAssistantPanel";
import { useAuth } from "../../contexts/AuthContext";
import { useAccessibility } from "../../contexts/AccessibilityContext";
import { SIGNS } from "../../data/signLanguage";
import { loadFavourites } from "../../data/signLanguage";
import api from "../../lib/api";
import { usePageAudio } from "../../contexts/AudioNavigationContext";

/**
 * Visual, caption-first dashboard for deaf and hard-of-hearing learners.
 *
 * Deliberately built on the same DashboardShell and the same emerald/#FAF9F5
 * design language as the standard dashboard - the brief was an accessible
 * variant, not a different-looking product. What actually changes:
 *  - nothing here depends on hearing; no audio-only affordance exists
 *  - a sign language learning section is promoted to a primary destination
 *  - a caption/visual-support notice explains what to expect in lessons
 *  - the AI assistant is text-first
 */

interface ProgressSummary {
  xp: number;
  streakDays: number;
  badges: Array<{ name: string }>;
}

export const VisualDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { prefs } = useAccessibility();
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const favouriteCount = loadFavourites().length;

  useEffect(() => {
    api
      .get("/progress")
      .then(({ data }) => setProgress(data))
      .catch(() => setProgress(null))
      .finally(() => setLoading(false));
  }, []);

  usePageAudio("Visual Dashboard", () =>
    `Your visual dashboard. Everything here works without sound. ` +
    (progress ? `${progress.xp} experience points, a ${progress.streakDays} day streak, ${progress.badges?.length ?? 0} badges. ` : "") +
    `Open sign language to learn the alphabet, or the practice quiz to test yourself.`
  );

  const showSignLanguage = user?.disabilityType === 'DEAFNESS' || user?.disabilityType === null;
  const navItems: NavItem[] = getStudentNavItems(showSignLanguage, "/dashboard/visual");

  const stats = [
    { label: "XP", value: progress?.xp ?? 0, icon: Zap, tone: "text-amber-600 bg-amber-50 border-amber-200" },
    { label: "Day streak", value: progress?.streakDays ?? 0, icon: Flame, tone: "text-rose-600 bg-rose-50 border-rose-200" },
    { label: "Badges", value: progress?.badges?.length ?? 0, icon: Award, tone: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    ...(showSignLanguage ? [
      { label: "Saved signs", value: favouriteCount, icon: Hand, tone: "text-sky-600 bg-sky-50 border-sky-200" },
    ] : []),
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <DashboardShell navItems={navItems}>
      <motion.div
        initial={prefs.reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {user?.name ? `Welcome back, ${user.name}` : "Welcome back"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Your visual dashboard. Everything here works without sound.
          </p>
        </div>

        {/* Caption-first promise - states plainly what to expect, so a learner
            never has to discover by failure that something needs hearing. */}
        <div className="flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3">
          <Captions className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-sky-900 leading-relaxed">
            <strong>Captions first.</strong> Every lesson is readable as text, and no activity ever
            requires hearing. Where a lesson has narration, the same words are always on screen.
            Turn on <strong>Sign language mode</strong> in Settings to see fingerspelling alongside
            storybook pages.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border mb-2 ${s.tone}`}>
                  <Icon className="w-4.5 h-4.5" aria-hidden="true" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{s.value}</div>
                <div className="text-xs text-slate-500 font-medium">{s.label}</div>
              </div>
            );
          })}
        </div>

        {showSignLanguage && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/dashboard/visual/sign-language"
              className="group bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 mb-3">
                <Hand className="w-6 h-6" aria-hidden="true" />
              </div>
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                Learn sign language
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </h2>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                {SIGNS.length} signs across the alphabet, numbers, greetings, school and feelings —
                with a searchable dictionary and favourites.
              </p>
            </Link>

            <Link
              to="/dashboard/visual/sign-quiz"
              className="group bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200 mb-3">
                <ClipboardList className="w-6 h-6" aria-hidden="true" />
              </div>
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                Practice quiz
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </h2>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Test what you've learned. Fully visual, with instant written feedback on every answer.
              </p>
            </Link>
          </div>
        )}

        <AiAssistantPanel />
      </motion.div>
    </DashboardShell>
  );
};

export default VisualDashboardPage;
