import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Award,
  Volume2,
  Gamepad2,
  ImageIcon,
  BookOpen,
  ArrowRight,
  Loader2,
  Zap,
  Play,
  Pause,
  Hand,
} from "lucide-react";
import api, { resolveMediaUrl } from "../lib/api";
import { usePageAudio } from "../contexts/AudioNavigationContext";
import { useAuth } from "../contexts/AuthContext";
import { useAccessibility } from "../contexts/AccessibilityContext";
import AslFingerspellingStrip from "../components/AslFingerspellingStrip";
import { useSpeech } from "../hooks/useSpeech";
import { extractSignWords } from "../data/aslAlphabet";

interface ModuleContent {
  unitTitle?: string;
  title?: string;
  explanation?: string;
  example?: string;
  imageUrl?: string;
  audioUrl?: string;
  questions?: Array<{
    question: string;
    options: string[];
    correct: string;
  }>;
}

interface Module {
  id: string;
  order: number;
  title: string;
  description: string;
  contentType: string;
  content: ModuleContent;
  targetUnitId?: string;
  targetLessonOrder?: number;
  completed: boolean;
}

interface CustomizedPlan {
  id: string;
  title: string;
  status: string;
  compositionSummary: {
    visual?: number;
    audio?: number;
    text?: number;
    focusScore?: number;
    styleName?: string;
    primaryTraits?: string[];
  };
  modules: Module[];
}

export const CustomPlanPlayerPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { speak, stop: stopSpeech, loading: ttsLoading } = useSpeech();

  const [plan, setPlan] = useState<CustomizedPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showXpCelebration, setShowXpCelebration] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const { prefs } = useAccessibility();
  const isDeafUser = user?.disabilityType === "DEAFNESS" || prefs.signLanguage;

  // AR Balloon game iframe ref & state
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [gameScore, setGameScore] = useState(0);

  const fetchPlan = useCallback(async () => {
    if (!subjectId) return;
    try {
      const { data } = await api.get(`/custom-plans/subjects/${subjectId}`);
      if (data.plan && data.plan.modules?.length > 0) {
        setPlan(data.plan);
        const firstUncompleted = data.plan.modules.findIndex((m: Module) => !m.completed);
        if (firstUncompleted !== -1) setActiveModuleIndex(firstUncompleted);
        setLoading(false);
        return;
      }
    } catch {
      /* Fallback */
    }

    try {
      const [enrolmentRes, historyRes] = await Promise.all([
        api.get("/classrooms/mine/enrolment").catch(() => ({ data: { enrolment: null } })),
        api.get("/assessments/history").catch(() => ({ data: { attempts: [] } }))
      ]);

      const enrolment = enrolmentRes.data?.enrolment;
      const history = historyRes.data?.attempts || [];
      const latest = history[0] || null;

      let foundSubject: any = null;
      if (enrolment?.classroom?.subjects) {
        foundSubject = enrolment.classroom.subjects.find((s: any) => s.id === subjectId);
      }

      const visual = Math.round(latest?.visualEngagement ?? 65);
      const audio = Math.round(latest?.audioEngagement ?? 50);
      const text = Math.round(latest?.textEngagement ?? 40);
      const focus = Math.round(latest?.attentionSpanScore ?? 75);

      const styleName = visual >= audio ? "Visual & Hands-on Strategist" : "Auditory Narrative Learner";

      const fallbackModules: Module[] = [];
      const units = foundSubject?.units || [];

      if (units.length === 0) {
        fallbackModules.push({
          id: "mod-1",
          order: 1,
          title: `Introductory Exploration for ${foundSubject?.name || "Subject"}`,
          description: `Customized orientation tailored to your ${styleName} profile.`,
          contentType: "MIXED_LESSON",
          completed: false,
          content: {
            unitTitle: foundSubject?.name || "Subject",
            title: `Welcome to ${foundSubject?.name || "Subject"}`,
            explanation: `Your personalized learning plan is dynamically arranged according to your focus level (${focus}%) and learning composition.`,
            example: "Interactive modules adapt topics into visual stories, 3D balloon games, and concept checks.",
            questions: [
              {
                question: `Ready to explore ${foundSubject?.name || "Subject"} using your customized plan?`,
                options: ["Yes, let us begin!", "Show visual mode", "Read aloud to me"],
                correct: "Yes, let us begin!"
              }
            ]
          }
        });
      } else {
        units.forEach((unit: any, uIdx: number) => {
          const cType = uIdx % 3 === 0 ? "VISUAL_STORY" : uIdx % 3 === 1 ? "GAME_CHALLENGE" : "AUDIO_EXPLANATION";
          fallbackModules.push({
            id: `mod-${uIdx + 1}`,
            order: uIdx + 1,
            title: `${unit.title}: Essential Concept`,
            description: `Adapted for your ${styleName} profile (Focus Span: ${focus}%).`,
            contentType: cType,
            targetUnitId: unit.id,
            targetLessonOrder: 1,
            completed: false,
            content: {
              unitTitle: unit.title,
              title: unit.title,
              explanation: `Comprehensive overview of ${unit.title}, tailored to your ${styleName} metrics. Focus on key principles and practical application.`,
              example: `Practical application of ${unit.title} in everyday problem solving.`,
              questions: [
                {
                  question: `Which core principle best describes ${unit.title}?`,
                  options: [
                    `Key foundational rule of ${unit.title}`,
                    "Secondary analysis detail",
                    "Alternative theoretical approach",
                    "None of the above"
                  ],
                  correct: `Key foundational rule of ${unit.title}`
                }
              ]
            }
          });
        });
      }

      setPlan({
        id: `plan-${subjectId}`,
        title: `${user?.name?.split(" ")[0] || "Learner"}'s ${styleName} Plan`,
        status: "READY",
        compositionSummary: {
          visual,
          audio,
          text,
          focusScore: focus,
          styleName,
          primaryTraits: [
            `${visual}% Visual / ${audio}% Audio / ${text}% Text`,
            `Focus Span: ${focus}%`,
            `Style: ${styleName}`
          ]
        },
        modules: fallbackModules
      });
    } catch (err) {
      console.error("Fallback generation failed:", err);
    } finally {
      setLoading(false);
    }
  }, [subjectId, user?.name]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const currentModule = plan?.modules?.[activeModuleIndex] || null;

  // Screen reader title registration only - NO auto-read aloud on page enter
  usePageAudio("Customized Learning Plan", () => {
    if (!currentModule) return "Customized plan.";
    return `${currentModule.title}. ${currentModule.description}.`;
  });

  // Post questions to AR balloon game iframe if module is GAME_CHALLENGE
  const postGameQuestions = useCallback(() => {
    if (!currentModule || !currentModule.content?.questions) return;
    const qList = currentModule.content.questions.map((q) => ({
      q: q.question,
      options: q.options.length === 4 ? q.options : [...q.options, "Option 3", "Option 4"].slice(0, 4),
      answer: q.correct
    }));

    iframeRef.current?.contentWindow?.postMessage(
      { type: "ar-questions", questions: qList },
      "*"
    );
  }, [currentModule]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "ar-ready") postGameQuestions();
      if (data.type === "ar-complete") {
        setGameScore(data.score);
        markModuleComplete();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [postGameQuestions]);

  useEffect(() => {
    postGameQuestions();
  }, [postGameQuestions]);

  const toggleAudioNarration = () => {
    if (isPlayingAudio) {
      stopSpeech();
      setIsPlayingAudio(false);
    } else if (currentModule) {
      setIsPlayingAudio(true);
      const text = `${currentModule.content?.title || currentModule.title}. ${currentModule.content?.explanation || ""}`;
      speak(text, currentModule.content?.audioUrl, () => setIsPlayingAudio(false));
    }
  };

  const handleOptionSelect = (opt: string) => {
    if (isAnswered) return;
    setSelectedOption(opt);
  };

  const markModuleComplete = async () => {
    if (!currentModule || !plan || currentModule.completed) return;
    setCompleting(true);
    try {
      await api.post(`/custom-plans/${plan.id}/modules/${currentModule.id}/complete`).catch(() => {});
      setShowXpCelebration(true);

      setPlan((prev) => {
        if (!prev) return null;
        const updatedModules = prev.modules.map((m, idx) =>
          idx === activeModuleIndex ? { ...m, completed: true } : m
        );
        return { ...prev, modules: updatedModules };
      });
      setTimeout(() => setShowXpCelebration(false), 3000);
    } catch (err) {
      console.error("Failed to complete module:", err);
    } finally {
      setCompleting(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!selectedOption || !currentModule || !plan) return;

    const question = currentModule.content?.questions?.[0];
    const correct = question ? selectedOption === question.correct : true;

    setIsCorrect(correct);
    setIsAnswered(true);

    if (correct && !currentModule.completed) {
      await markModuleComplete();
    }
  };

  const handleNextModule = () => {
    stopSpeech();
    setIsPlayingAudio(false);
    setSelectedOption(null);
    setIsAnswered(false);
    setIsCorrect(false);
    if (plan && activeModuleIndex < plan.modules.length - 1) {
      setActiveModuleIndex((prev) => prev + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!plan || !currentModule) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-md text-center max-w-md">
          <Sparkles className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">No Customized Plan Ready</h1>
          <p className="text-slate-500 text-xs mb-6">
            Please return to your classroom and click "Generate Customized Plan".
          </p>
          <Link
            to="/classroom"
            className="inline-flex items-center gap-2 bg-emerald-500 text-white font-bold px-5 py-3 rounded-2xl text-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Classroom
          </Link>
        </div>
      </div>
    );
  }

  const completedCount = plan.modules.filter((m) => m.completed).length;
  const totalCount = plan.modules.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const question = currentModule.content?.questions?.[0];
  const isGameChallenge = currentModule.contentType === "GAME_CHALLENGE" || currentModule.contentType === "AR";
  const isVisualStory = currentModule.contentType === "VISUAL_STORY" || currentModule.contentType === "STORY";

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800 font-sans p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-4">
            <Link
              to="/classroom"
              onClick={stopSpeech}
              className="p-3 rounded-2xl bg-[#FAF9F5] border border-slate-200 text-slate-600 hover:text-slate-900 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500 text-white">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <h1 className="text-xl font-bold text-slate-900">{plan.title}</h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Segregated learning path tailored to your test metrics & focus composition
              </p>
            </div>
          </div>

          <div className="w-full sm:w-64 space-y-1">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>Overall Completion</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Celebratory Banner */}
        <AnimatePresence>
          {showXpCelebration && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-emerald-500 text-white p-4 rounded-2xl shadow-md flex items-center justify-between font-bold text-sm"
            >
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 fill-white" />
                <span>+25 XP Earned! Module progress synced to underlying classroom unit.</span>
              </div>
              <Award className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left/Main Column: Active Module View */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              {/* Module Badge & Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Module {activeModuleIndex + 1} of {totalCount}
                  </span>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
                    {isVisualStory && <ImageIcon className="w-3.5 h-3.5 text-sky-600" />}
                    {isGameChallenge && <Gamepad2 className="w-3.5 h-3.5 text-purple-600" />}
                    {currentModule.contentType === "AUDIO_EXPLANATION" && <Volume2 className="w-3.5 h-3.5 text-amber-600" />}
                    {currentModule.contentType === "MIXED_LESSON" && <BookOpen className="w-3.5 h-3.5 text-emerald-600" />}
                    {currentModule.contentType.replace("_", " ")}
                  </span>
                </div>
                {currentModule.completed && (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" /> Completed
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">
                  {currentModule.content?.title || currentModule.title}
                </h2>
                <p className="text-xs text-slate-500">{currentModule.description}</p>
              </div>

              {/* 1. REAL 3D BALLOON GAME VIEW IF TAGGED GAME_CHALLENGE / AR */}
              {isGameChallenge ? (
                <div className="space-y-4 w-full">
                  <div className="flex items-center justify-between bg-purple-50 p-4 rounded-2xl border border-purple-200">
                    <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                      <Gamepad2 className="w-5 h-5 text-purple-600" />
                      <span>3D Balloon Popping Challenge</span>
                    </div>
                    <span className="text-xs font-bold bg-white text-purple-800 px-3 py-1 rounded-full border border-purple-200">
                      Score: {gameScore}
                    </span>
                  </div>
                  <iframe
                    ref={iframeRef}
                    src="/ar-game.html"
                    title="AR balloon game"
                    onLoad={postGameQuestions}
                    className="w-full min-h-[480px] sm:min-h-[580px] h-[65vh] rounded-3xl border border-slate-700 bg-slate-950 shadow-md transition-all"
                  />
                </div>
              ) : isVisualStory ? (
                /* 2. REAL STORYBOOK 2-PAGE SPREAD IF TAGGED VISUAL_STORY / STORY */
                <div className="w-full bg-[#f8f4ec] p-6 sm:p-8 rounded-3xl border border-amber-300/80 shadow-md space-y-6">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-700" /> Illustrated Storybook View
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
                    <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs space-y-3 flex flex-col justify-between">
                      <div className="min-h-[220px] sm:min-h-[260px] h-64 rounded-xl overflow-hidden bg-slate-100">
                        <img
                          src={resolveMediaUrl(currentModule.content?.imageUrl || "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&auto=format&fit=crop")}
                          alt="Story illustration"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-xs font-bold text-slate-900">{currentModule.content?.title}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs space-y-4 flex flex-col justify-between">
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-serif">
                        {currentModule.content?.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* 3. DEFAULT/MIXED LESSON & AUDIO VIEW */
                <div className="space-y-6">
                  {currentModule.content?.imageUrl && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-72">
                      <img
                        src={resolveMediaUrl(currentModule.content.imageUrl)}
                        alt={currentModule.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Explanation Text */}
                  <div className="bg-[#FAF9F5] p-5 rounded-2xl border border-slate-200/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-600" /> Explanation
                      </h3>

                      {/* Manual Play Narration Button - NEVER auto-plays */}
                      <button
                        onClick={toggleAudioNarration}
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs cursor-pointer"
                      >
                        {isPlayingAudio ? (
                          <>
                            <Pause className="w-3.5 h-3.5 text-amber-600" /> Pause Narration
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> Listen to Narration
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed">
                      {currentModule.content?.explanation}
                    </p>

                    {currentModule.content?.example && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs text-slate-600">
                        <strong className="text-slate-800">Example: </strong>
                        {currentModule.content.example}
                      </div>
                    )}

                    {/* Full Sign Language Translation - ONLY rendered for DEAF users when contentType is SIGN */}
                    {isDeafUser && currentModule.contentType === "SIGN" && (
                      <div className="space-y-4 pt-4 border-t border-slate-200/80">
                        <div className="flex items-center gap-2">
                          <Hand className="w-5 h-5 text-sky-600" />
                          <h3 className="font-bold text-sm text-slate-900">
                            Full Sign Language Translation
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500">
                          Visual handshapes and fingerspelling guide for all key concepts in this module:
                        </p>
                        <div className="space-y-3">
                          {extractSignWords(`${currentModule.title} ${currentModule.content?.explanation}`, 8).map((word, idx) => (
                            <AslFingerspellingStrip key={idx} word={word} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Interactive Assessment Check for non-game modules */}
              {!isGameChallenge && question && (
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-emerald-600" /> Interactive Concept Check
                  </h3>
                  <p className="text-sm font-semibold text-slate-800">{question.question}</p>

                  <div className="space-y-2.5">
                    {question.options.map((opt, i) => {
                      const isSelected = selectedOption === opt;
                      let btnClass = "border-slate-200 bg-[#FAF9F5] text-slate-700 hover:border-emerald-300";
                      if (isSelected) {
                        btnClass = "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-xs";
                      }
                      if (isAnswered) {
                        if (opt === question.correct) {
                          btnClass = "border-emerald-500 bg-emerald-100 text-emerald-900 font-bold";
                        } else if (isSelected) {
                          btnClass = "border-rose-400 bg-rose-50 text-rose-800 font-bold";
                        }
                      }

                      return (
                        <button
                          key={i}
                          onClick={() => handleOptionSelect(opt)}
                          disabled={isAnswered}
                          className={`w-full text-left p-3.5 rounded-2xl border text-xs transition-all cursor-pointer flex items-center justify-between ${btnClass}`}
                        >
                          <span>{opt}</span>
                          {isAnswered && opt === question.correct && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    {!isAnswered ? (
                      <button
                        onClick={handleAnswerSubmit}
                        disabled={!selectedOption || completing}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-2xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all text-xs cursor-pointer disabled:opacity-50"
                      >
                        {completing ? "Saving..." : "Submit Check"}
                      </button>
                    ) : (
                      <button
                        onClick={handleNextModule}
                        disabled={activeModuleIndex >= totalCount - 1}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-2xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all text-xs cursor-pointer flex items-center gap-2 disabled:opacity-50 ml-auto"
                      >
                        <span>Next Module</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Module Navigator */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Customized Sequence
              </h3>
              <div className="space-y-2">
                {plan.modules.map((mod, idx) => {
                  const isActive = idx === activeModuleIndex;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => {
                        stopSpeech();
                        setIsPlayingAudio(false);
                        setActiveModuleIndex(idx);
                        setSelectedOption(null);
                        setIsAnswered(false);
                        setIsCorrect(false);
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isActive
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-bold"
                          : mod.completed
                          ? "border-slate-200 bg-slate-50 text-slate-600"
                          : "border-slate-100 bg-[#FAF9F5] text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-[#FAF9F5] border border-slate-200 flex items-center justify-center text-[11px] font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs truncate font-semibold">{mod.title}</span>
                      </div>
                      {mod.completed && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomPlanPlayerPage;
