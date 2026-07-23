import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Clock, LogOut, Volume2, Image as ImageIcon, BookOpen, Camera, Eye, Sparkles } from 'lucide-react';
import Button from '../components/ui/Button';

type LearningMode = 'TEXT' | 'AUDIO' | 'VISUAL';

type EngagementTotals = Record<LearningMode, { totalScore: number; samples: number; focusedSamples: number }>;

type QuizSummary = {
  score: number;
  total: number;
  profile: Record<LearningMode, number>;
  recommended: LearningMode;
  completedAt: string;
  sessionMode: LearningMode;
};

type CvEngagementResponse = {
  engagement_score: number;
  face_detected: boolean;
  gaze: 'forward' | 'left' | 'right' | 'up' | 'down' | 'away';
  blink_detected: boolean;
  head_pose: { pitch: number; yaw: number; roll: number };
};

const CV_SERVICE_URL = import.meta.env.VITE_CV_SERVICE_URL || 'http://localhost:8000';
const TRACKING_INTERVAL_MS = 700;
const LOW_EYE_CONTACT_THRESHOLD = 40;
const LOW_EYE_CONTACT_SAMPLES = 5;
const MODE_CONFIDENCE_SAMPLES = 3;
const SUMMARY_STORAGE_KEY = 'neurolearn:lastQuizSummary';

// 20 Complete Questions Categorized by Mode
const demo20Questions = [
  { id: '1', question: 'What is 5 + 3?', options: ['6', '7', '8', '9'], answer: '8', learningMode: 'TEXT', subject: 'Math', imageUrl: null },
  { id: '2', question: 'Which animal is known as the King of the Jungle?', options: ['Tiger', 'Elephant', 'Lion', 'Bear'], answer: 'Lion', learningMode: 'VISUAL', subject: 'Science', imageUrl: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=800&q=80' },
  { id: '3', question: 'Listen carefully: What color is the clear sky during daytime?', options: ['Red', 'Blue', 'Green', 'Yellow'], answer: 'Blue', learningMode: 'AUDIO', subject: 'Science', imageUrl: null },
  { id: '4', question: 'What is 12 - 4?', options: ['6', '7', '8', '9'], answer: '8', learningMode: 'TEXT', subject: 'Math', imageUrl: null },
  { id: '5', question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], answer: 'Mars', learningMode: 'VISUAL', subject: 'Astronomy', imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=800&q=80' },
  { id: '6', question: 'Listen carefully: How many legs does a spider have?', options: ['6', '8', '10', '4'], answer: '8', learningMode: 'AUDIO', subject: 'Nature', imageUrl: null },
  { id: '7', question: 'What is 4 x 3?', options: ['10', '12', '14', '16'], answer: '12', learningMode: 'TEXT', subject: 'Math', imageUrl: null },
  { id: '8', question: 'Which of these is a mammal that can fly?', options: ['Eagle', 'Bat', 'Pigeon', 'Butterfly'], answer: 'Bat', learningMode: 'VISUAL', subject: 'Animals', imageUrl: 'https://images.unsplash.com/photo-1590005354167-6da97870c757?auto=format&fit=crop&w=800&q=80' },
  { id: '9', question: 'Listen carefully: What sound does a dog make?', options: ['Meow', 'Woof', 'Moo', 'Quack'], answer: 'Woof', learningMode: 'AUDIO', subject: 'Sounds', imageUrl: null },
  { id: '10', question: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], answer: '6', learningMode: 'TEXT', subject: 'Geometry', imageUrl: null },
  { id: '11', question: 'Which ocean is the largest on Earth?', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], answer: 'Pacific', learningMode: 'VISUAL', subject: 'Geography', imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80' },
  { id: '12', question: 'Listen carefully: What is 9 + 6?', options: ['13', '14', '15', '16'], answer: '15', learningMode: 'AUDIO', subject: 'Math', imageUrl: null },
  { id: '13', question: 'What is the freezing point of water in Celsius?', options: ['0°C', '10°C', '32°C', '100°C'], answer: '0°C', learningMode: 'TEXT', subject: 'Science', imageUrl: null },
  { id: '14', question: 'Which fruit is famous for having seeds on the outside?', options: ['Apple', 'Banana', 'Strawberry', 'Grape'], answer: 'Strawberry', learningMode: 'VISUAL', subject: 'Botany', imageUrl: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=800&q=80' },
  { id: '15', question: 'Listen carefully: Which gas do humans need to breathe to live?', options: ['Carbon Dioxide', 'Oxygen', 'Nitrogen', 'Helium'], answer: 'Oxygen', learningMode: 'AUDIO', subject: 'Biology', imageUrl: null },
  { id: '16', question: 'What is 15 ÷ 3?', options: ['3', '4', '5', '6'], answer: '5', learningMode: 'TEXT', subject: 'Math', imageUrl: null },
  { id: '17', question: 'Which organ pumps blood throughout the human body?', options: ['Brain', 'Lungs', 'Heart', 'Stomach'], answer: 'Heart', learningMode: 'VISUAL', subject: 'Anatomy', imageUrl: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=800&q=80' },
  { id: '18', question: 'Listen carefully: How many days are in a leap year?', options: ['364', '365', '366', '367'], answer: '366', learningMode: 'AUDIO', subject: 'General Knowledge', imageUrl: null },
  { id: '19', question: 'Which primary colors mix together to make Green?', options: ['Red & Blue', 'Blue & Yellow', 'Red & Yellow', 'Purple & White'], answer: 'Blue & Yellow', learningMode: 'TEXT', subject: 'Art', imageUrl: null },
  { id: '20', question: 'What is 20 - 7?', options: ['11', '12', '13', '14'], answer: '13', learningMode: 'TEXT', subject: 'Math', imageUrl: null },
];

export const QuizPage: React.FC = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState(demo20Questions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMode, setCurrentMode] = useState<LearningMode>('TEXT');
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showTransition, setShowTransition] = useState(false);
  const [score, setScore] = useState(0);

  // Real Camera & Face/Eye Tracking State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [gazeStatus, setGazeStatus] = useState<string>('Detecting... 👁️');
  const [engagementScore, setEngagementScore] = useState<number>(0);
  const [adaptationToast, setAdaptationToast] = useState<string | null>(null);

  // Engagement tracking per mode
  const [modeEngagement, setModeEngagement] = useState<EngagementTotals>({
    TEXT: { totalScore: 0, samples: 0, focusedSamples: 0 },
    AUDIO: { totalScore: 0, samples: 0, focusedSamples: 0 },
    VISUAL: { totalScore: 0, samples: 0, focusedSamples: 0 }
  });

  const lowEyeContactCounter = useRef(0);
  const adaptationLockedRef = useRef(false);
  const currentIndexRef = useRef(0);
  const currentModeRef = useRef<LearningMode>('TEXT');
  const modeEngagementRef = useRef<EngagementTotals>(modeEngagement);
  const scoreSmoothingRef = useRef(0);
  const visitedQuestionIdsRef = useRef(new Set([demo20Questions[0].id]));
  const sessionIdRef = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `quiz-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const synth = window.speechSynthesis;

  const buildQuizSummary = useCallback((finalScore: number, finalTotal: number): QuizSummary => {
    const totals = modeEngagementRef.current;
    const modes: LearningMode[] = ['TEXT', 'AUDIO', 'VISUAL'];
    const profile = modes.reduce((acc, mode) => {
      acc[mode] = totals[mode].samples > 0
        ? Math.round(totals[mode].totalScore / totals[mode].samples)
        : 0;
      return acc;
    }, {} as Record<LearningMode, number>);

    const sampledModes = modes.filter(mode => totals[mode].samples > 0);
    const recommended = (sampledModes.length > 0 ? sampledModes : modes).reduce((best, mode) => {
      return profile[mode] > profile[best] ? mode : best;
    }, currentModeRef.current);

    return {
      score: finalScore,
      total: Math.max(1, finalTotal),
      profile,
      recommended,
      completedAt: new Date().toISOString(),
      sessionMode: currentModeRef.current
    };
  }, []);

  const finishQuiz = useCallback((finalScore: number, finalTotal = visitedQuestionIdsRef.current.size) => {
    const summary = buildQuizSummary(finalScore, finalTotal);
    localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(summary));
    navigate('/quiz/result', { state: summary });
  }, [buildQuizSummary, navigate]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
    if (questions[currentIndex]) {
      visitedQuestionIdsRef.current.add(questions[currentIndex].id);
    }
  }, [currentIndex]);

  useEffect(() => {
    currentModeRef.current = currentMode;
  }, [currentMode]);

  useEffect(() => {
    modeEngagementRef.current = modeEngagement;
  }, [modeEngagement]);

  const getGazeLabel = (result: CvEngagementResponse) => {
    if (!result.face_detected) return 'No Face Detected';
    if (result.gaze === 'forward') return 'Focused';
    if (result.gaze === 'left' || result.gaze === 'right') return 'Side Glance';
    if (result.gaze === 'up') return 'Looking Up';
    if (result.gaze === 'down') return 'Looking Down';
    return 'Looking Away';
  };

  const drawTrackingOverlay = (isFaceInFrame: boolean, gaze: string) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas?.getContext('2d');
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
    ctx.strokeStyle = isFaceInFrame ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    if (isFaceInFrame) {
      ctx.fillStyle = gaze === 'forward' ? '#f59e0b' : '#f97316';
      ctx.beginPath();
      ctx.arc(width * 0.42, height * 0.42, 5, 0, Math.PI * 2);
      ctx.arc(width * 0.58, height * 0.42, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const captureFrame = () =>
    new Promise<string | null>((resolve) => {
      const video = videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) {
        resolve(null);
        return;
      }

      const canvas = analysisCanvasRef.current ?? document.createElement('canvas');
      analysisCanvasRef.current = canvas;
      canvas.width = 320;
      canvas.height = Math.round((video.videoHeight / video.videoWidth) * canvas.width) || 240;

      const ctx = canvas.getContext('2d', { willReadFrequently: false });
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.62);
    });

  const pickBestMode = useCallback((): LearningMode => {
    const totals = modeEngagementRef.current;
    const modes: LearningMode[] = ['TEXT', 'AUDIO', 'VISUAL'];
    const explorationOrder: LearningMode[] = ['VISUAL', 'AUDIO', 'TEXT'];
    const confidentModes = modes.filter(mode => totals[mode].samples >= MODE_CONFIDENCE_SAMPLES);
    const currentMode = currentModeRef.current;

    if (confidentModes.length === 0) {
      return explorationOrder.find(mode => mode !== currentMode && totals[mode].samples === 0) ?? currentMode;
    }

    const currentAverage = totals[currentMode].samples > 0
      ? totals[currentMode].totalScore / totals[currentMode].samples
      : 0;
    const untriedMode = explorationOrder.find(mode => mode !== currentMode && totals[mode].samples === 0);
    if (currentAverage < LOW_EYE_CONTACT_THRESHOLD && untriedMode) {
      return untriedMode;
    }

    const rankedModes = (confidentModes.length > 0 ? confidentModes : modes).sort((a, b) => {
      const aAvg = totals[a].samples > 0 ? totals[a].totalScore / totals[a].samples : 0;
      const bAvg = totals[b].samples > 0 ? totals[b].totalScore / totals[b].samples : 0;
      const aFocusedRate = totals[a].samples > 0 ? totals[a].focusedSamples / totals[a].samples : 0;
      const bFocusedRate = totals[b].samples > 0 ? totals[b].focusedSamples / totals[b].samples : 0;
      return (bAvg + bFocusedRate * 20) - (aAvg + aFocusedRate * 20);
    });

    return rankedModes[0] ?? currentMode;
  }, []);

  const findNextQuestionIndex = useCallback((mode: LearningMode) => {
    const visited = visitedQuestionIdsRef.current;
    const start = currentIndexRef.current + 1;
    const nextInMode = questions.findIndex((question, index) => (
      index >= start && question.learningMode === mode && !visited.has(question.id)
    ));
    if (nextInMode !== -1) return nextInMode;

    const anyFreshInMode = questions.findIndex(question => (
      question.learningMode === mode && !visited.has(question.id)
    ));
    if (anyFreshInMode !== -1) return anyFreshInMode;

    return null;
  }, [questions]);

  const handleEyeContactLossAdaptation = useCallback(() => {
    if (adaptationLockedRef.current || selectedAnswer !== null) return;

    adaptationLockedRef.current = true;
    const bestMode = pickBestMode();
    const nextIndex = findNextQuestionIndex(bestMode);
    if (nextIndex === null) {
      finishQuiz(score);
      return;
    }

    const nextTopic = questions[nextIndex]?.subject ?? 'next topic';

    setAdaptationToast(`Eye contact dropped. Moving to ${nextTopic} in ${bestMode} mode.`);
    setTimeout(() => setAdaptationToast(null), 4000);

    setShowTransition(true);
    synth.cancel();

    window.setTimeout(() => {
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
    }, 900);
  }, [findNextQuestionIndex, finishQuiz, pickBestMode, questions, score, selectedAnswer, synth]);

  // 1. Clean Camera Initialization & Lifecycle Release
  useEffect(() => {
    let stream: MediaStream | null = null;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, max: 640 },
            height: { ideal: 480, max: 480 },
            frameRate: { ideal: 24, max: 30 },
            facingMode: 'user'
          },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
          setCameraActive(true);
          setCameraError(null);
        }
      } catch (err) {
        console.warn('Webcam permission not granted or camera in use', err);
        setCameraError('Camera access required for real eye tracking');
        setCameraActive(false);
      }
    }
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 2. Real OpenCV/MediaPipe Eye Tracking, throttled so the UI stays smooth.
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
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ frame, session_id: sessionIdRef.current })
            });

            if (!response.ok) throw new Error(`CV service returned ${response.status}`);
            const result = await response.json() as CvEngagementResponse;
            if (cancelled) return;

            const isFaceInFrame = result.face_detected;
            const rawScore = isFaceInFrame ? Math.max(0, Math.min(100, result.engagement_score)) : 0;
            const smoothedScore = isFaceInFrame
              ? Math.round(scoreSmoothingRef.current * 0.82 + rawScore * 0.18)
              : 0;
            scoreSmoothingRef.current = Math.abs(smoothedScore - scoreSmoothingRef.current) < 3
              ? scoreSmoothingRef.current
              : smoothedScore;
            const calculatedScore = scoreSmoothingRef.current;
            const isFocused = isFaceInFrame && result.gaze === 'forward' && calculatedScore >= 60;
            const mode = currentModeRef.current;

            setFaceDetected(isFaceInFrame);
            setEngagementScore(calculatedScore);
            setGazeStatus(getGazeLabel(result));
            setCameraError(null);

            setModeEngagement(prev => {
              if (!isFaceInFrame) return prev;
              const updated = {
                ...prev,
                [mode]: {
                  totalScore: prev[mode].totalScore + calculatedScore,
                  samples: prev[mode].samples + 1,
                  focusedSamples: prev[mode].focusedSamples + (isFocused ? 1 : 0)
                }
              };
              modeEngagementRef.current = updated;
              return updated;
            });

            if (!isFaceInFrame || calculatedScore < LOW_EYE_CONTACT_THRESHOLD || result.gaze === 'away') {
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
            console.warn('CV eye tracking unavailable', err);
            setCameraError('Start the CV service on port 8000 for eye tracking');
            setFaceDetected(false);
            setEngagementScore(0);
            setGazeStatus('CV Service Offline');
            lowEyeContactCounter.current = 0;
            drawTrackingOverlay(false, 'away');
          }
        } finally {
          requestInFlight = false;
        }
      }
      if (!cancelled) animationFrameId = requestAnimationFrame(processEyeTracking);
    };

    animationFrameId = requestAnimationFrame(processEyeTracking);
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrameId);
    };
  }, [cameraActive, handleEyeContactLossAdaptation]);

  // Timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      finishQuiz(score);
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, finishQuiz, score]);

  // Handle TTS for Audio Mode
  useEffect(() => {
    if (currentMode === 'AUDIO' && questions[currentIndex]) {
      speakText(questions[currentIndex].question);
    }
    return () => synth.cancel();
  }, [currentIndex, currentMode, questions]);

  const speakText = (text: string) => {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const friendlyVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.lang.includes('en'));
    if (friendlyVoice) utterance.voice = friendlyVoice;
    utterance.rate = 0.9;
    synth.speak(utterance);
  };

  const handleAnswer = (option: string) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(option);
    const correct = option === questions[currentIndex].answer;
    setIsCorrect(correct);
    if (correct) setScore(prev => prev + 1);

    setTimeout(() => {
      const nextIndex = findNextQuestionIndex(currentModeRef.current);
      if (nextIndex !== null) {
        setCurrentIndex(nextIndex);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        finishQuiz(score + (correct ? 1 : 0));
      }
    }, 1200);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentQ = questions[currentIndex];
  if (!currentQ) return null;

  return (
    <div className="min-h-screen bg-dark flex flex-col relative overflow-hidden">
      {/* Adaptation Toast Notification */}
      <AnimatePresence>
        {adaptationToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-accent text-dark font-bold px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 border border-amber-300"
          >
            <Sparkles className="w-5 h-5 shrink-0" />
            <span>{adaptationToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <header className="glass px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b border-white/10">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xl font-bold">
            <Clock className="w-5 h-5 text-accent" />
            <span className={timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-white'}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="hidden sm:flex items-center space-x-2 px-4 py-1.5 rounded-full bg-dark-card border border-white/10">
            {currentMode === 'TEXT' && <><BookOpen className="w-4 h-4 text-primary" /> <span className="text-sm font-medium">Text Mode</span></>}
            {currentMode === 'AUDIO' && <><Volume2 className="w-4 h-4 text-blue-400" /> <span className="text-sm font-medium">Audio Mode</span></>}
            {currentMode === 'VISUAL' && <><ImageIcon className="w-4 h-4 text-green-400" /> <span className="text-sm font-medium">Visual Mode</span></>}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <div className="h-2.5 w-full bg-dark-card rounded-full overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-primary via-accent to-green-400 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
          <div className="text-center text-xs text-gray-300 font-medium mt-1">
            Question {currentIndex + 1} of {questions.length} • Score: {score}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white">
            <LogOut className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:flex-row items-center justify-center p-4 sm:p-8 relative max-w-7xl mx-auto w-full gap-6">
        
        {/* Left/Main Question Card */}
        <div className="flex-1 w-full max-w-3xl">
          <AnimatePresence mode="wait">
            {showTransition ? (
              <motion.div
                key="transition"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="glass-strong p-12 rounded-3xl text-center flex flex-col items-center justify-center my-auto min-h-[400px]"
              >
                <div className="w-20 h-20 mb-6 rounded-full bg-primary/20 flex items-center justify-center animate-bounce">
                  {currentMode === 'TEXT' && <BookOpen className="w-10 h-10 text-primary" />}
                  {currentMode === 'AUDIO' && <Volume2 className="w-10 h-10 text-blue-400" />}
                  {currentMode === 'VISUAL' && <ImageIcon className="w-10 h-10 text-green-400" />}
                </div>
                <h2 className="text-3xl font-display font-bold">Eye Contact Adaptation...</h2>
                <p className="text-gray-300 mt-2 text-lg">Adapting topic & switching to <span className="text-accent font-semibold">{currentMode} Mode</span></p>
              </motion.div>
            ) : (
              <motion.div
                key={currentQ.id + currentMode + currentIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full glass-strong p-6 sm:p-10 rounded-3xl border border-white/10 shadow-2xl"
              >
                {/* Question Header & Image */}
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-400 mb-4">
                    Subject: {currentQ.subject.toUpperCase()}
                  </div>

                  {currentMode === 'VISUAL' && currentQ.imageUrl && (
                    <div className="relative overflow-hidden rounded-2xl mb-6 max-h-72">
                      <img 
                        src={currentQ.imageUrl} 
                        alt="Visual context" 
                        className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  
                  {currentMode === 'AUDIO' && (
                    <button 
                      onClick={() => speakText(currentQ.question)}
                      className="mx-auto w-20 h-20 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full flex items-center justify-center mb-6 hover:scale-110 transition-transform shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                      title="Click to re-listen"
                    >
                      <Volume2 className="w-10 h-10 animate-pulse" />
                    </button>
                  )}

                  <h2 className="text-2xl sm:text-3xl font-display font-semibold leading-relaxed">
                    {currentQ.question}
                  </h2>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentQ.options.map((option, idx) => {
                    let btnClass = "glass hover:bg-white/10 hover:border-white/30 text-lg py-5 text-left px-6 rounded-2xl transition-all font-medium relative overflow-hidden group";
                    
                    if (selectedAnswer === option) {
                      if (isCorrect) btnClass = "bg-green-500/20 border-green-500 text-green-300 text-lg py-5 text-left px-6 rounded-2xl font-medium relative";
                      else btnClass = "bg-red-500/20 border-red-500 text-red-300 text-lg py-5 text-left px-6 rounded-2xl font-medium relative";
                    } else if (selectedAnswer !== null && option === currentQ.answer) {
                      btnClass = "bg-green-500/20 border-green-500 text-green-300 text-lg py-5 text-left px-6 rounded-2xl font-medium relative";
                    }

                    return (
                      <button
                        key={idx}
                        disabled={selectedAnswer !== null}
                        onClick={() => handleAnswer(option)}
                        className={btnClass}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <span className="inline-block w-8 h-8 rounded-full bg-dark/50 text-center leading-8 mr-3 text-sm font-bold border border-white/10">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Sidebar Widget: ACCURATE CAMERA & EYE TRACKING OVERLAY */}
        <aside className="w-full md:w-80 shrink-0">
          <div className="glass-strong p-5 rounded-3xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="flex items-center font-bold text-sm text-gray-200">
                <Camera className="w-4 h-4 mr-2 text-primary" /> Live Eye Tracking
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center ${faceDetected ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                <span className={`w-2 h-2 rounded-full mr-1.5 ${faceDetected ? 'bg-green-400 animate-ping' : 'bg-red-500'}`} />
                {faceDetected ? 'Face Detected' : 'No Face'}
              </span>
            </div>

            {/* Webcam / Canvas Video Feed */}
            <div className="relative w-full h-44 bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-80" />

              {!cameraActive && (
                <div className="p-4 text-center space-y-2">
                  <Eye className="w-8 h-8 text-primary mx-auto animate-pulse" />
                  <p className="text-xs text-gray-400">{cameraError || 'Requesting camera permissions...'}</p>
                </div>
              )}

              {/* Target Reticle Overlay */}
              <div className="absolute inset-0 border border-primary/20 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className={`w-16 h-16 border rounded-full transition-all duration-300 ${faceDetected ? 'border-accent/60 scale-100' : 'border-red-500/60 scale-90'}`} />
              </div>
            </div>

            {/* Gaze Status & Attention Score */}
            <div className="space-y-3 pt-1">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 font-medium">Eye Gaze:</span>
                <span className={`font-bold ${faceDetected ? 'text-accent' : 'text-red-400'}`}>{gazeStatus}</span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Attention Score</span>
                  <span className={`font-bold ${engagementScore >= 60 ? 'text-green-400' : engagementScore >= 30 ? 'text-amber-400' : 'text-red-400'}`}>
                    {engagementScore}%
                  </span>
                </div>
                <div className="h-2.5 w-full bg-dark rounded-full overflow-hidden border border-white/10">
                  <div 
                    className={`h-full transition-all duration-300 ${engagementScore >= 60 ? 'bg-green-400' : engagementScore >= 30 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${engagementScore}%` }}
                  />
                </div>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-xs text-gray-300 space-y-1">
                <div className="flex items-center font-semibold text-primary-light">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-accent" /> Dynamic Eye Adaptation
                </div>
                <p className="text-[11px] text-gray-400">
                  If eye contact drops, the system automatically adapts to your highest performing learning mode!
                </p>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default QuizPage;
