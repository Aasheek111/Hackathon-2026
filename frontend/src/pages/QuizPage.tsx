import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  LogOut,
  Volume2,
  Image as ImageIcon,
  BookOpen,
  Camera,
  Eye,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { homePathFor } from "../lib/homePath";

type LearningMode = "TEXT" | "AUDIO" | "VISUAL";

type EngagementTotals = Record<
  LearningMode,
  { totalScore: number; samples: number; focusedSamples: number }
>;

type CvEngagementResponse = {
  engagement_score: number;
  face_detected: boolean;
  gaze: "forward" | "left" | "right" | "up" | "down" | "away";
  blink_detected: boolean;
  head_pose: { pitch: number; yaw: number; roll: number };
};

const CV_SERVICE_URL =
  import.meta.env.VITE_CV_SERVICE_URL || "http://localhost:8000";
const TRACKING_INTERVAL_MS = 250;
const LOW_EYE_CONTACT_THRESHOLD = 40;
const LOW_EYE_CONTACT_SAMPLES = 8;
const MODE_CONFIDENCE_SAMPLES = 3;
// How long the "Adapting Learning Mode…" screen stays up before the next
// question replaces it. Long enough to actually read what changed and why -
// at under a second it read as a flicker and the question just jumped.
const MODE_TRANSITION_MS = 3500;
// How long the correct/incorrect feedback stays on screen after answering
// before advancing. Learners need time to register the result, especially
// when the answer was wrong.
const ANSWER_FEEDBACK_MS = 3000;

const demo20Questions = [
  {
    id: "1",
    question: "What is 5 + 3?",
    options: ["6", "7", "8", "9"],
    answer: "8",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: null,
  },
  {
    id: "2",
    question: "Which animal is known as the King of the Jungle?",
    options: ["Tiger", "Elephant", "Lion", "Bear"],
    answer: "Lion",
    learningMode: "VISUAL",
    subject: "Science",
    imageUrl:
      "https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "3",
    question: "Listen carefully: What color is the clear sky during daytime?",
    options: ["Red", "Blue", "Green", "Yellow"],
    answer: "Blue",
    learningMode: "AUDIO",
    subject: "Science",
    imageUrl: null,
  },
  {
    id: "4",
    question: "What is 12 - 4?",
    options: ["6", "7", "8", "9"],
    answer: "8",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: null,
  },
  {
    id: "5",
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    answer: "Mars",
    learningMode: "VISUAL",
    subject: "Astronomy",
    imageUrl:
      "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "6",
    question: "Listen carefully: How many legs does a spider have?",
    options: ["6", "8", "10", "4"],
    answer: "8",
    learningMode: "AUDIO",
    subject: "Nature",
    imageUrl: null,
  },
  {
    id: "7",
    question: "What is 4 x 3?",
    options: ["10", "12", "14", "16"],
    answer: "12",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: null,
  },
  {
    id: "8",
    question: "Which of these is a mammal that can fly?",
    options: ["Eagle", "Bat", "Pigeon", "Butterfly"],
    answer: "Bat",
    learningMode: "VISUAL",
    subject: "Animals",
    imageUrl:
      "https://images.unsplash.com/photo-1590005354167-6da97870c757?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "9",
    question: "Listen carefully: What sound does a dog make?",
    options: ["Meow", "Woof", "Moo", "Quack"],
    answer: "Woof",
    learningMode: "AUDIO",
    subject: "Sounds",
    imageUrl: null,
  },
  {
    id: "10",
    question: "How many sides does a hexagon have?",
    options: ["5", "6", "7", "8"],
    answer: "6",
    learningMode: "TEXT",
    subject: "Geometry",
    imageUrl: null,
  },
  {
    id: "11",
    question: "Which ocean is the largest on Earth?",
    options: ["Atlantic", "Indian", "Pacific", "Arctic"],
    answer: "Pacific",
    learningMode: "VISUAL",
    subject: "Geography",
    imageUrl:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "12",
    question: "Listen carefully: What is 9 + 6?",
    options: ["13", "14", "15", "16"],
    answer: "15",
    learningMode: "AUDIO",
    subject: "Math",
    imageUrl: null,
  },
  {
    id: "13",
    question: "What is the freezing point of water in Celsius?",
    options: ["0°C", "10°C", "32°C", "100°C"],
    answer: "0°C",
    learningMode: "TEXT",
    subject: "Science",
    imageUrl: null,
  },
  {
    id: "14",
    question: "Which fruit is famous for having seeds on the outside?",
    options: ["Apple", "Banana", "Strawberry", "Grape"],
    answer: "Strawberry",
    learningMode: "VISUAL",
    subject: "Botany",
    imageUrl:
      "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "15",
    question: "Listen carefully: Which gas do humans need to breathe to live?",
    options: ["Carbon Dioxide", "Oxygen", "Nitrogen", "Helium"],
    answer: "Oxygen",
    learningMode: "AUDIO",
    subject: "Biology",
    imageUrl: null,
  },
  {
    id: "16",
    question: "What is 15 ÷ 3?",
    options: ["3", "4", "5", "6"],
    answer: "5",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: null,
  },
  {
    id: "17",
    question: "Which organ pumps blood throughout the human body?",
    options: ["Brain", "Lungs", "Heart", "Stomach"],
    answer: "Heart",
    learningMode: "VISUAL",
    subject: "Anatomy",
    imageUrl:
      "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "18",
    question: "Listen carefully: How many days are in a leap year?",
    options: ["364", "365", "366", "367"],
    answer: "366",
    learningMode: "AUDIO",
    subject: "General Knowledge",
    imageUrl: null,
  },
  {
    id: "19",
    question: "Which primary colors mix together to make Green?",
    options: ["Red & Blue", "Blue & Yellow", "Red & Yellow", "Purple & White"],
    answer: "Blue & Yellow",
    learningMode: "TEXT",
    subject: "Art",
    imageUrl: null,
  },
  {
    id: "20",
    question: "What is 20 - 7?",
    options: ["11", "12", "13", "14"],
    answer: "13",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: null,
  },
];

export const QuizPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState(demo20Questions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMode, setCurrentMode] = useState<LearningMode>("TEXT");
  const [timeLeft, setTimeLeft] = useState(900);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showTransition, setShowTransition] = useState(false);
  const [score, setScore] = useState(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [gazeStatus, setGazeStatus] = useState<string>("Detecting... 👁️");
  const [engagementScore, setEngagementScore] = useState<number>(0);
  const [adaptationToast, setAdaptationToast] = useState<string | null>(null);

  const [modeEngagement, setModeEngagement] = useState<EngagementTotals>({
    TEXT: { totalScore: 0, samples: 0, focusedSamples: 0 },
    AUDIO: { totalScore: 0, samples: 0, focusedSamples: 0 },
    VISUAL: { totalScore: 0, samples: 0, focusedSamples: 0 },
  });

  const lowEyeContactCounter = useRef(0);
  const adaptationLockedRef = useRef(false);
  const currentIndexRef = useRef(0);
  const currentModeRef = useRef<LearningMode>("TEXT");
  const modeEngagementRef = useRef<EngagementTotals>(modeEngagement);
  const scoreSmoothingRef = useRef(0);
  const visitedQuestionIdsRef = useRef(new Set([demo20Questions[0].id]));
  const sessionIdRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `quiz-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const synth = window.speechSynthesis;

  const attemptIdRef = useRef<string | null>(null);
  const adaptationCountRef = useRef(0);
  const completedRef = useRef(false);
  const startedAtMsRef = useRef(Date.now());
  const engagementSyncCounterRef = useRef(0);

  useEffect(() => {
    api
      .post("/assessments/start")
      .then(({ data }) => {
        attemptIdRef.current = data.attemptId;
      })
      .catch(() => undefined);
  }, []);

  const completeAssessment = useCallback(
    (finalScore: number, finalTotal: number): Promise<any | null> => {
      if (completedRef.current || !attemptIdRef.current)
        return Promise.resolve(null);
      completedRef.current = true;
      const durationSeconds = Math.round(
        (Date.now() - startedAtMsRef.current) / 1000,
      );
      return api
        .post(`/assessments/${attemptIdRef.current}/complete`, {
          modeEngagement: modeEngagementRef.current,
          adaptationCount: adaptationCountRef.current,
          scoreCorrect: finalScore,
          scoreTotal: finalTotal,
          durationSeconds,
        })
        .then(({ data }) => data.attempt)
        .catch(() => null);
    },
    [],
  );

  useEffect(() => {
    currentIndexRef.current = currentIndex;
    if (questions[currentIndex]) {
      visitedQuestionIdsRef.current.add(questions[currentIndex].id);
    }
  }, [currentIndex, questions]);

  useEffect(() => {
    currentModeRef.current = currentMode;
  }, [currentMode]);

  useEffect(() => {
    modeEngagementRef.current = modeEngagement;
  }, [modeEngagement]);

  const getGazeLabel = (result: CvEngagementResponse) => {
    if (!result.face_detected) return "No Face Detected";
    if (result.gaze === "forward") return "Focused";
    if (result.gaze === "left" || result.gaze === "right") return "Side Glance";
    if (result.gaze === "up") return "Looking Up";
    if (result.gaze === "down") return "Looking Down";
    return "Looking Away";
  };

  const drawTrackingOverlay = (isFaceInFrame: boolean, gaze: string) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !video || !ctx) return;

    const width = video.videoWidth || 320;
    const height = video.videoHeight || 240;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    const boxWidth = width * 0.44;
    const boxHeight = height * 0.42;
    const boxX = (width - boxWidth) / 2;
    const boxY = height * 0.22;
    ctx.strokeStyle = isFaceInFrame ? "#10B981" : "#F43F5E";
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    if (isFaceInFrame) {
      ctx.fillStyle = gaze === "forward" ? "#F59E0B" : "#F97316";
      ctx.beginPath();
      ctx.arc(width * 0.42, height * 0.42, 5, 0, Math.PI * 2);
      ctx.arc(width * 0.58, height * 0.42, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const captureFrame = () =>
    new Promise<string | null>((resolve) => {
      const video = videoRef.current;
      if (
        !video ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        video.videoWidth === 0
      ) {
        resolve(null);
        return;
      }
      const canvas =
        analysisCanvasRef.current ?? document.createElement("canvas");
      analysisCanvasRef.current = canvas;
      canvas.width = 320;
      canvas.height =
        Math.round((video.videoHeight / video.videoWidth) * canvas.width) ||
        240;
      const ctx = canvas.getContext("2d", { willReadFrequently: false });
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () =>
            resolve(typeof reader.result === "string" ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.62,
      );
    });

  const pickBestMode = useCallback((): LearningMode => {
    const totals = modeEngagementRef.current;
    const modes: LearningMode[] = ["TEXT", "AUDIO", "VISUAL"];
    const explorationOrder: LearningMode[] = ["VISUAL", "AUDIO", "TEXT"];
    const confidentModes = modes.filter(
      (mode) => totals[mode].samples >= MODE_CONFIDENCE_SAMPLES,
    );
    const currentMode = currentModeRef.current;
    if (confidentModes.length === 0) {
      return (
        explorationOrder.find(
          (mode) => mode !== currentMode && totals[mode].samples === 0,
        ) ?? currentMode
      );
    }
    const currentAverage =
      totals[currentMode].samples > 0
        ? totals[currentMode].totalScore / totals[currentMode].samples
        : 0;
    const untriedMode = explorationOrder.find(
      (mode) => mode !== currentMode && totals[mode].samples === 0,
    );
    if (currentAverage < LOW_EYE_CONTACT_THRESHOLD && untriedMode) {
      return untriedMode;
    }
    const rankedModes = (
      confidentModes.length > 0 ? confidentModes : modes
    ).sort((a, b) => {
      const aAvg =
        totals[a].samples > 0 ? totals[a].totalScore / totals[a].samples : 0;
      const bAvg =
        totals[b].samples > 0 ? totals[b].totalScore / totals[b].samples : 0;
      const aFocusedRate =
        totals[a].samples > 0
          ? totals[a].focusedSamples / totals[a].samples
          : 0;
      const bFocusedRate =
        totals[b].samples > 0
          ? totals[b].focusedSamples / totals[b].samples
          : 0;
      return bAvg + bFocusedRate * 20 - (aAvg + aFocusedRate * 20);
    });
    return rankedModes[0] ?? currentMode;
  }, []);

  const findNextQuestionIndex = useCallback(
    (mode: LearningMode) => {
      const visited = visitedQuestionIdsRef.current;
      const start = currentIndexRef.current + 1;
      const nextInMode = questions.findIndex(
        (question, index) =>
          index >= start &&
          question.learningMode === mode &&
          !visited.has(question.id),
      );
      if (nextInMode !== -1) return nextInMode;
      const anyFreshInMode = questions.findIndex(
        (question) =>
          question.learningMode === mode && !visited.has(question.id),
      );
      return anyFreshInMode !== -1 ? anyFreshInMode : null;
    },
    [questions],
  );

  const handleEyeContactLossAdaptation = useCallback(() => {
    if (adaptationLockedRef.current || selectedAnswer !== null) return;
    adaptationLockedRef.current = true;
    const bestMode = pickBestMode();
    const nextIndex = findNextQuestionIndex(bestMode);
    if (nextIndex === null) {
      completeAssessment(score, visitedQuestionIdsRef.current.size).then(
        (attempt) => {
          navigate("/quiz/result", {
            state: {
              score,
              total: visitedQuestionIdsRef.current.size,
              attempt,
            },
          });
        },
      );
      return;
    }
    const nextTopic = questions[nextIndex]?.subject ?? "next topic";
    const isRealSwitch = bestMode !== currentModeRef.current;
    setAdaptationToast(
      `Attention shift detected! Switching to ${nextTopic} in ${bestMode} mode.`,
    );
    setTimeout(() => setAdaptationToast(null), 4000);
    setShowTransition(true);
    synth.cancel();
    window.setTimeout(() => {
      if (isRealSwitch) adaptationCountRef.current += 1;
      setCurrentMode(bestMode);
      setCurrentIndex(nextIndex);
      currentIndexRef.current = nextIndex;
      currentModeRef.current = bestMode;
      setSelectedAnswer(null);
      setIsCorrect(null);
      setShowTransition(false);
      lowEyeContactCounter.current = 0;
      window.setTimeout(() => {
        adaptationLockedRef.current = false;
      }, 1800);
    }, MODE_TRANSITION_MS);
  }, [
    completeAssessment,
    findNextQuestionIndex,
    navigate,
    pickBestMode,
    questions,
    score,
    selectedAnswer,
    synth,
  ]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, max: 640 },
            height: { ideal: 480, max: 480 },
            frameRate: { ideal: 24, max: 30 },
            facingMode: "user",
          },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
          setCameraActive(true);
          setCameraError(null);
        }
      } catch (err) {
        console.warn("Webcam permission not granted or camera in use", err);
        setCameraError("Camera access requested for real eye tracking");
        setCameraActive(false);
      }
    }
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    let lastSampleTime = 0;
    let requestInFlight = false;
    let cancelled = false;
    const processEyeTracking = async (now: number) => {
      if (now - lastSampleTime > TRACKING_INTERVAL_MS && !requestInFlight) {
        lastSampleTime = now;
        requestInFlight = true;
        try {
          if (videoRef.current && canvasRef.current && cameraActive) {
            const frame = await captureFrame();
            if (!frame || cancelled) {
              requestInFlight = false;
              animationFrameId = requestAnimationFrame(processEyeTracking);
              return;
            }
            const response = await fetch(`${CV_SERVICE_URL}/analyze-frame`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ frame, session_id: sessionIdRef.current }),
            });
            if (!response.ok)
              throw new Error(`CV service returned ${response.status}`);
            const result = (await response.json()) as CvEngagementResponse;
            if (cancelled) return;
            const isFaceInFrame = result.face_detected;
            const rawScore = isFaceInFrame
              ? Math.max(0, Math.min(100, result.engagement_score))
              : 0;
            scoreSmoothingRef.current = isFaceInFrame
              ? Math.round(scoreSmoothingRef.current * 0.55 + rawScore * 0.45)
              : 0;
            const calculatedScore = scoreSmoothingRef.current;
            const isFocused =
              isFaceInFrame &&
              result.gaze === "forward" &&
              calculatedScore >= 60;
            const mode = currentModeRef.current;
            setFaceDetected(isFaceInFrame);
            setEngagementScore(calculatedScore);
            setGazeStatus(getGazeLabel(result));
            setCameraError(null);
            setModeEngagement((prev) => {
              if (!isFaceInFrame) return prev;
              const updated = {
                ...prev,
                [mode]: {
                  totalScore: prev[mode].totalScore + calculatedScore,
                  samples: prev[mode].samples + 1,
                  focusedSamples:
                    prev[mode].focusedSamples + (isFocused ? 1 : 0),
                },
              };
              modeEngagementRef.current = updated;
              return updated;
            });
            engagementSyncCounterRef.current += 1;
            if (
              attemptIdRef.current &&
              engagementSyncCounterRef.current % 8 === 0
            ) {
              api
                .post(`/assessments/${attemptIdRef.current}/engagement`, {
                  score: calculatedScore,
                  faceDetected: isFaceInFrame,
                  gaze: result.gaze,
                  mode,
                })
                .catch(() => undefined);
            }
            if (
              !isFaceInFrame ||
              calculatedScore < LOW_EYE_CONTACT_THRESHOLD ||
              result.gaze === "away"
            ) {
              lowEyeContactCounter.current += 1;
              if (lowEyeContactCounter.current >= LOW_EYE_CONTACT_SAMPLES) {
                handleEyeContactLossAdaptation();
              }
            } else {
              lowEyeContactCounter.current = 0;
            }
            drawTrackingOverlay(isFaceInFrame, result.gaze);
          }
        } catch (err) {
          if (!cancelled) {
            console.warn("CV eye tracking unavailable", err);
            setCameraError("Start CV service on port 8000 for eye tracking");
            setFaceDetected(false);
            setEngagementScore(0);
            setGazeStatus("CV Service Offline");
            lowEyeContactCounter.current = 0;
            drawTrackingOverlay(false, "away");
          }
        } finally {
          requestInFlight = false;
        }
      }
      if (!cancelled)
        animationFrameId = requestAnimationFrame(processEyeTracking);
    };
    animationFrameId = requestAnimationFrame(processEyeTracking);
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrameId);
    };
  }, [cameraActive, handleEyeContactLossAdaptation]);

  useEffect(() => {
    if (timeLeft <= 0) {
      completeAssessment(score, visitedQuestionIdsRef.current.size).then(
        (attempt) => {
          navigate("/quiz/result", {
            state: {
              score,
              total: visitedQuestionIdsRef.current.size,
              attempt,
            },
          });
        },
      );
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, navigate, score, completeAssessment]);

  useEffect(() => {
    if (currentMode === "AUDIO" && questions[currentIndex]) {
      speakText(questions[currentIndex].question);
    }
    return () => synth.cancel();
  }, [currentIndex, currentMode, questions]);

  const speakText = (text: string) => {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const friendlyVoice = voices.find(
      (v) =>
        v.name.includes("Google") ||
        v.name.includes("Samantha") ||
        v.lang.includes("en"),
    );
    if (friendlyVoice) utterance.voice = friendlyVoice;
    utterance.rate = 0.9;
    synth.speak(utterance);
  };

  const handleAnswer = (option: string) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(option);
    const correct = option === questions[currentIndex].answer;
    setIsCorrect(correct);
    if (correct) setScore((prev) => prev + 1);
    if (attemptIdRef.current) {
      api
        .post(`/assessments/${attemptIdRef.current}/answer`, {
          questionId: questions[currentIndex].id,
          answer: option,
          correct,
          mode: currentModeRef.current,
        })
        .catch(() => undefined);
    }
    setTimeout(() => {
      const nextIndex = findNextQuestionIndex(currentModeRef.current);
      if (nextIndex !== null) {
        setCurrentIndex(nextIndex);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        const finalScore = score + (correct ? 1 : 0);
        completeAssessment(finalScore, visitedQuestionIdsRef.current.size).then(
          (attempt) => {
            navigate("/quiz/result", {
              state: {
                score: finalScore,
                total: visitedQuestionIdsRef.current.size,
                attempt,
              },
            });
          },
        );
      }
    }, ANSWER_FEEDBACK_MS);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const currentQ = questions[currentIndex];
  if (!currentQ) return null;

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900 flex flex-col relative overflow-hidden">
      <AnimatePresence>
        {adaptationToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-100 border border-amber-300 text-amber-900 font-bold px-6 py-3 rounded-2xl shadow-md flex items-center space-x-2 text-sm"
          >
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{adaptationToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b border-slate-200 shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 font-bold text-lg">
            <Clock className="w-5 h-5 text-amber-500" />
            <span
              className={
                timeLeft < 60 ? "text-rose-600 animate-pulse" : "text-slate-900"
              }
            >
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="hidden sm:flex items-center space-x-2 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold">
            {currentMode === "TEXT" && (
              <>
                <BookOpen className="w-4 h-4 text-amber-600" />{" "}
                <span>Text Mode</span>
              </>
            )}
            {currentMode === "AUDIO" && (
              <>
                <Volume2 className="w-4 h-4 text-sky-600" />{" "}
                <span>Audio Mode</span>
              </>
            )}
            {currentMode === "VISUAL" && (
              <>
                <ImageIcon className="w-4 h-4 text-emerald-600" />{" "}
                <span>Visual Mode</span>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{
                width: `${((currentIndex + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
          <div className="text-center text-xs text-slate-500 font-bold mt-1">
            Question {currentIndex + 1} of {questions.length} • Score: {score}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              completeAssessment(
                score,
                visitedQuestionIdsRef.current.size,
              ).then((attempt) => {
                navigate("/quiz/result", {
                  state: {
                    score,
                    total: visitedQuestionIdsRef.current.size,
                    attempt,
                  },
                });
              });
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3.5 py-2 rounded-2xl transition-all"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="hidden sm:inline">Skip Demo</span>
          </button>
          <button
            onClick={() => navigate(homePathFor(user))}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-2xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row items-center justify-center p-4 sm:p-8 relative max-w-7xl mx-auto w-full gap-6">
        <div className="flex-1 w-full max-w-3xl">
          <AnimatePresence mode="wait">
            {showTransition ? (
              <motion.div
                key="transition"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="bg-white p-12 rounded-3xl border border-slate-200/80 shadow-md text-center flex flex-col items-center justify-center my-auto min-h-[380px]"
              >
                <div className="w-20 h-20 mb-6 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 animate-bounce">
                  {currentMode === "TEXT" && <BookOpen className="w-10 h-10" />}
                  {currentMode === "AUDIO" && <Volume2 className="w-10 h-10" />}
                  {currentMode === "VISUAL" && (
                    <ImageIcon className="w-10 h-10" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Adapting Learning Mode…
                </h2>
                <p className="text-slate-600 mt-2 text-sm">
                  Switching dynamically to{" "}
                  <strong className="text-emerald-700 font-bold">
                    {currentMode} Mode
                  </strong>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={currentQ.id + currentMode + currentIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-md"
              >
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 mb-4">
                    Subject: {currentQ.subject.toUpperCase()}
                  </div>

                  {currentMode === "VISUAL" && currentQ.imageUrl && (
                    <div className="relative overflow-hidden rounded-2xl mb-6 max-h-72 border border-slate-200">
                      <img
                        src={currentQ.imageUrl}
                        alt="Visual context"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {currentMode === "AUDIO" && (
                    <button
                      onClick={() => speakText(currentQ.question)}
                      className="mx-auto w-16 h-16 bg-sky-100 text-sky-700 border border-sky-200 rounded-full flex items-center justify-center mb-6 hover:scale-105 transition-transform shadow-xs"
                      title="Click to re-listen"
                    >
                      <Volume2 className="w-8 h-8 animate-pulse" />
                    </button>
                  )}

                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">
                    {currentQ.question}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentQ.options.map((option, idx) => {
                    let btnClass =
                      "bg-[#FAF9F5] hover:bg-slate-100 border border-slate-200 text-slate-800 text-base py-4 text-left px-6 rounded-2xl transition-all font-bold relative flex items-center";

                    if (selectedAnswer === option) {
                      if (isCorrect)
                        btnClass =
                          "bg-emerald-50 border-2 border-emerald-500 text-emerald-900 text-base py-4 text-left px-6 rounded-2xl font-bold relative flex items-center";
                      else
                        btnClass =
                          "bg-rose-50 border-2 border-rose-400 text-rose-900 text-base py-4 text-left px-6 rounded-2xl font-bold relative flex items-center";
                    } else if (
                      selectedAnswer !== null &&
                      option === currentQ.answer
                    ) {
                      btnClass =
                        "bg-emerald-50 border-2 border-emerald-500 text-emerald-900 text-base py-4 text-left px-6 rounded-2xl font-bold relative flex items-center";
                    }

                    return (
                      <button
                        key={idx}
                        disabled={selectedAnswer !== null}
                        onClick={() => handleAnswer(option)}
                        className={btnClass}
                      >
                        <span className="inline-block w-8 h-8 rounded-xl bg-white text-center leading-8 mr-3 text-xs font-bold border border-slate-200 text-slate-700 shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className="w-full md:w-80 shrink-0">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center font-bold text-xs text-slate-900">
                <Camera className="w-4 h-4 mr-2 text-emerald-600" /> Live Eye
                Tracking
              </span>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center border ${faceDetected ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"}`}
              >
                <span
                  className={`w-2 h-2 rounded-full mr-1.5 ${faceDetected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
                />
                {faceDetected ? "Face Detected" : "No Face"}
              </span>
            </div>

            <div className="relative w-full h-40 bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
              />

              {!cameraActive && (
                <div className="p-4 text-center space-y-2">
                  <Eye className="w-8 h-8 text-emerald-400 mx-auto animate-pulse" />
                  <p className="text-xs text-slate-300 font-medium">
                    {cameraError || "Requesting camera permissions..."}
                  </p>
                </div>
              )}

              <div className="absolute inset-0 border border-emerald-400/30 rounded-2xl pointer-events-none flex items-center justify-center">
                <div
                  className={`w-14 h-14 border-2 rounded-full transition-all duration-300 ${faceDetected ? "border-amber-400 scale-100" : "border-rose-400 scale-90"}`}
                />
              </div>
            </div>

            <div className="space-y-3 pt-1 text-xs">
              <div className="flex justify-between items-center font-semibold">
                <span className="text-slate-500">Eye Gaze:</span>
                <span
                  className={`font-bold ${faceDetected ? "text-emerald-700" : "text-rose-600"}`}
                >
                  {gazeStatus}
                </span>
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span className="text-slate-500">Attention Score</span>
                  <span
                    className={
                      engagementScore >= 60
                        ? "text-emerald-700"
                        : engagementScore >= 30
                          ? "text-amber-700"
                          : "text-rose-700"
                    }
                  >
                    {engagementScore}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className={`h-full transition-all duration-300 ${engagementScore >= 60 ? "bg-emerald-500" : engagementScore >= 30 ? "bg-amber-500" : "bg-rose-500"}`}
                    style={{ width: `${engagementScore}%` }}
                  />
                </div>
              </div>

              {/* <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 text-xs text-emerald-900 space-y-1 font-medium">
                <div className="flex items-center font-bold text-emerald-800">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Gentle Adaptive AI
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  If focus drifts, NeuroLearn switches cards smoothly to keep learning stress-free!
                </p>
              </div> */}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default QuizPage;
