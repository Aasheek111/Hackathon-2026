import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Play, RefreshCw, Loader2 } from "lucide-react";
import api from "../lib/api";

interface Module {
  id: string;
  order: number;
  title: string;
  contentType: string;
  completed: boolean;
}

interface CustomizedPlan {
  id: string;
  title: string;
  status: "QUEUED" | "GENERATING" | "READY" | "FAILED";
  compositionSummary: {
    visual?: number;
    audio?: number;
    text?: number;
    focusScore?: number;
    styleName?: string;
    primaryTraits?: string[];
  };
  errorMessage?: string | null;
  modules: Module[];
}

export const CustomPlanSubjectCard: React.FC<{ subjectId: string; subjectName: string }> = ({
  subjectId,
  subjectName,
}) => {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<CustomizedPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchPlan = useCallback(async () => {
    try {
      const { data } = await api.get(`/custom-plans/subjects/${subjectId}`);
      if (data?.plan) {
        setPlan(data.plan);
      }
    } catch {
      /* Silent catch - fallback ready state */
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // Poll while plan is QUEUED or GENERATING
  useEffect(() => {
    if (!plan || (plan.status !== "QUEUED" && plan.status !== "GENERATING")) return;
    const interval = setInterval(fetchPlan, 3000);
    return () => clearInterval(interval);
  }, [plan, fetchPlan]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post(`/custom-plans/subjects/${subjectId}/generate`).catch(() => {});
      await fetchPlan();
      // Ensure navigation to customized plan player works directly
      navigate(`/classroom/subjects/${subjectId}/custom-plan`);
    } catch (err: any) {
      console.error(err);
      navigate(`/classroom/subjects/${subjectId}/custom-plan`);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return null;

  const completedCount = plan?.modules?.filter((m) => m.completed).length ?? 0;
  const totalCount = plan?.modules?.length ?? 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const summary = plan?.compositionSummary;

  return (
    <div className="mb-6 p-6 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border border-emerald-200/80 shadow-xs relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500 text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              {plan?.title || `Personalized ${subjectName} Path`}
            </h3>
            <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Customized for You
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
            Segregates and mixes topics across all units in {subjectName} according to your test performance, attention span, and preferred learning composition.
          </p>

          {summary?.primaryTraits && summary.primaryTraits.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {summary.primaryTraits.map((trait, idx) => (
                <span
                  key={idx}
                  className="text-[11px] font-semibold bg-white/80 text-slate-700 px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-2xs"
                >
                  {trait}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-[11px] font-semibold bg-white/80 text-slate-700 px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-2xs">
                Adaptive AI Segregation
              </span>
              <span className="text-[11px] font-semibold bg-white/80 text-slate-700 px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-2xs">
                Focus & Composition Blending
              </span>
            </div>
          )}

          {plan?.status === "READY" && totalCount > 0 && (
            <div className="pt-2 max-w-md">
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Custom Plan Progress</span>
                <span>
                  {completedCount} / {totalCount} Modules ({progressPercent}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {(!plan || plan.status === "FAILED") && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-5 rounded-2xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all text-xs cursor-pointer disabled:opacity-60"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Generate Customized Plan</span>
            </button>
          )}

          {(plan?.status === "QUEUED" || plan?.status === "GENERATING") && (
            <div className="inline-flex items-center justify-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 font-bold py-3 px-5 rounded-2xl text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              <span>Queue Worker Processing...</span>
            </div>
          )}

          {plan?.status === "READY" && (
            <>
              <button
                onClick={() => navigate(`/classroom/subjects/${subjectId}/custom-plan`)}
                className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-5 rounded-2xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all text-xs cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Launch Customized Plan</span>
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                title="Re-run AI queue worker to incorporate newly uploaded units or updated metrics"
                className="inline-flex items-center justify-center p-3 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-2xl text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
