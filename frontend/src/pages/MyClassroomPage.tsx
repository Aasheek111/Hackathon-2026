import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Loader2,
  Lock,
  PlayCircle,
  ArrowRight,
  FileText,
} from "lucide-react";
import DashboardShell, { NavItem } from "../components/DashboardShell";
import api from "../lib/api";

interface Unit {
  id: string;
  title: string;
  order: number;
  indexStatus: string;
}
interface Subject {
  id: string;
  name: string;
  units: Unit[];
}
interface Enrolment {
  classroom: {
    id: string;
    name: string;
    description: string | null;
    teacher: { name: string };
    subjects: Subject[];
  };
}

export const MyClassroomPage: React.FC = () => {
  const navigate = useNavigate();
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      api
        .get("/classrooms/mine/enrolment")
        .then(({ data }) => setEnrolment(data.enrolment))
        .finally(() => setLoading(false));
    };
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: BookOpen, label: "My Classroom", path: "/classroom", active: true },
    { icon: TrendingUp, label: "My Progress", path: "/progress" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!enrolment) {
    return (
      <DashboardShell navItems={navItems}>
        <div className="max-w-2xl mx-auto bg-white p-10 rounded-3xl border border-slate-200/80 shadow-md text-center mt-12">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-200">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Not in a classroom yet
          </h1>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            Complete the adaptive assessment to receive a personalized classroom
            recommendation!
          </p>
          <button
            onClick={() => navigate("/recommendation")}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all text-sm"
          >
            <span>View Recommendations</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </DashboardShell>
    );
  }

  const { classroom } = enrolment;

  return (
    <DashboardShell navItems={navItems}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto space-y-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {classroom.name}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Educator:{" "}
            <strong className="text-slate-800 font-bold">
              {classroom.teacher.name}
            </strong>
          </p>
        </div>

        {classroom.subjects.map((subject) => (
          <div
            key={subject.id}
            className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs"
          >
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {subject.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subject.units.map((unit) => {
                const ready = unit.indexStatus === "READY";
                return (
                  <div
                    key={unit.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      ready
                        ? "border-emerald-200 bg-emerald-50/40 shadow-xs"
                        : "border-slate-200 bg-[#FAF9F5] opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          {unit.title}
                        </p>
                        <p className="text-xs font-semibold mt-1 text-slate-500">
                          {ready
                            ? "Ready to Learn"
                            : unit.indexStatus === "PROCESSING"
                              ? "Processing…"
                              : "Locked"}
                        </p>
                      </div>
                      {ready ? (
                        <PlayCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                      ) : (
                        <Lock className="w-5 h-5 text-slate-400 shrink-0" />
                      )}
                    </div>
                    {ready && (
                      <div className="flex gap-2">
                        {/* Two doors: our adaptive tutorial, or the teacher's raw PDF. */}
                        <button
                          onClick={() =>
                            navigate(`/classroom/units/${unit.id}/tutorial`)
                          }
                          className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-3 rounded-xl text-xs shadow-xs transition-all"
                        >
                          <PlayCircle className="w-4 h-4" /> Interactive
                          Tutorial
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/classroom/units/${unit.id}/document`)
                          }
                          className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 font-bold py-2.5 px-3 rounded-xl text-xs transition-all"
                        >
                          <FileText className="w-4 h-4" /> Read Original
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {subject.units.length === 0 && (
                <p className="text-slate-400 text-xs">
                  No learning units available yet.
                </p>
              )}
            </div>
          </div>
        ))}

        {classroom.subjects.length === 0 && (
          <div className="bg-white p-10 rounded-3xl border border-slate-200/80 text-center text-slate-500 text-sm">
            Your educator hasn't added any subjects to this classroom yet.
          </div>
        )}
      </motion.div>
    </DashboardShell>
  );
};

export default MyClassroomPage;
