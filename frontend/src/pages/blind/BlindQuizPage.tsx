import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, Volume2, Square, ArrowLeft, Loader2, Trophy } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSpeech } from "../../hooks/useSpeech";
import { useVoiceCommands, VoiceCommand } from "../../hooks/useVoiceCommands";
import api from "../../lib/api";

/**
 * The blind learner's equivalent of the adaptive quiz.
 *
 * The standard quiz scores engagement from a webcam and switches presentation
 * mode when the learner looks away - neither of which is meaningful here. This
 * one instead reads the question and options aloud, accepts a spoken answer
 * ("option B" / "B" / the option's text), confirms what it heard, and explains
 * the result out loud before moving on.
 *
 * It posts to the SAME /assessments endpoints as the sighted quiz, so
 * finishing it satisfies the one free trial exactly like the normal flow
 * (see ProtectedRoute's trialPath in App.tsx).
 */

interface VoiceQuestion {
  id: string;
  question: string;
  options: string[];
  answer: string;
  subject: string;
}

// Audio-native questions: nothing here depends on seeing an image or a
// diagram, unlike the sighted bank's VISUAL items.
const AUDIO_QUESTIONS: VoiceQuestion[] = [
  { id: "b1", question: "What is 5 plus 3?", options: ["6", "7", "8", "9"], answer: "8", subject: "Math" },
  { id: "b2", question: "What sound does a dog make?", options: ["Meow", "Woof", "Moo", "Quack"], answer: "Woof", subject: "Sounds" },
  { id: "b3", question: "How many legs does a spider have?", options: ["Six", "Eight", "Ten", "Four"], answer: "Eight", subject: "Nature" },
  { id: "b4", question: "Which gas do humans need to breathe to live?", options: ["Carbon dioxide", "Oxygen", "Nitrogen", "Helium"], answer: "Oxygen", subject: "Biology" },
  { id: "b5", question: "What is 12 minus 4?", options: ["6", "7", "8", "9"], answer: "8", subject: "Math" },
  { id: "b6", question: "How many days are in a leap year?", options: ["364", "365", "366", "367"], answer: "366", subject: "General Knowledge" },
  { id: "b7", question: "What is the freezing point of water in Celsius?", options: ["Zero degrees", "Ten degrees", "Thirty two degrees", "One hundred degrees"], answer: "Zero degrees", subject: "Science" },
  { id: "b8", question: "What is 4 times 3?", options: ["10", "12", "14", "16"], answer: "12", subject: "Math" },
];

const LETTERS = ["A", "B", "C", "D"];
/** Pause after spoken feedback before the next question, so it doesn't run over the answer. */
const NEXT_QUESTION_DELAY_MS = 3500;

export const BlindQuizPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { speak, stop: stopSpeaking } = useSpeech();

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const attemptIdRef = useRef<string | null>(null);
  const startedAtRef = useRef(Date.now());
  const completedRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const question = AUDIO_QUESTIONS[index];
  const isLast = index >= AUDIO_QUESTIONS.length - 1;

  useEffect(() => {
    api
      .post("/assessments/start")
      .then(({ data }) => {
        attemptIdRef.current = data.attemptId;
      })
      .catch(() => undefined);
  }, []);

  useEffect(
    () => () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      stopSpeaking();
    },
    [stopSpeaking],
  );

  const announce = useCallback(
    (text: string) => {
      setAnnouncement(text);
      speak(text);
    },
    [speak],
  );

  const questionScript = useCallback(
    (q: VoiceQuestion, position: number) =>
      `Question ${position + 1} of ${AUDIO_QUESTIONS.length}. ${q.question} ` +
      q.options.map((opt, i) => `Option ${LETTERS[i]}: ${opt}.`).join(" ") +
      " Say your answer, for example: option A.",
    [],
  );

  const finish = useCallback(
    async (finalScore: number) => {
      if (completedRef.current) return;
      completedRef.current = true;
      setSubmitting(true);
      const summary = `Quiz complete. You scored ${finalScore} out of ${AUDIO_QUESTIONS.length}.`;
      setFinished(true);
      announce(summary);
      try {
        if (attemptIdRef.current) {
          await api.post(`/assessments/${attemptIdRef.current}/complete`, {
            // Zeroed on purpose: there is no webcam in this flow, and inventing
            // focus samples would corrupt the teacher's avgFocus analytics.
            // The mode is stated outright instead - see the backend's
            // preferredMode override.
            modeEngagement: {
              TEXT: { totalScore: 0, samples: 0, focusedSamples: 0 },
              AUDIO: { totalScore: 0, samples: 0, focusedSamples: 0 },
              VISUAL: { totalScore: 0, samples: 0, focusedSamples: 0 },
            },
            preferredMode: "AUDIO",
            adaptationCount: 0,
            scoreCorrect: finalScore,
            scoreTotal: AUDIO_QUESTIONS.length,
            durationSeconds: Math.round((Date.now() - startedAtRef.current) / 1000),
          });
        }
        // The trial is now used - refresh so ProtectedRoute stops routing
        // this learner back here and the dashboard opens.
        await refreshUser();
      } catch {
        /* score already spoken; a failed sync shouldn't block the learner */
      } finally {
        setSubmitting(false);
      }
    },
    [announce, refreshUser],
  );

  const answerWith = useCallback(
    (choiceIndex: number) => {
      if (answered || finished || !question) return;
      const chosen = question.options[choiceIndex];
      if (chosen === undefined) return;

      setAnswered(true);
      const correct = chosen === question.answer;
      const nextScore = correct ? score + 1 : score;
      if (correct) setScore(nextScore);

      const feedback = correct
        ? `You selected option ${LETTERS[choiceIndex]}, ${chosen}. That is correct.`
        : `You selected option ${LETTERS[choiceIndex]}, ${chosen}. That is not right. The correct answer is ${question.answer}.`;
      announce(feedback);

      if (attemptIdRef.current) {
        api
          .post(`/assessments/${attemptIdRef.current}/answer`, {
            questionId: question.id,
            answer: chosen,
            correct,
            mode: "AUDIO",
          })
          .catch(() => undefined);
      }

      advanceTimerRef.current = setTimeout(() => {
        if (isLast) {
          finish(nextScore);
        } else {
          const nextIndex = index + 1;
          setIndex(nextIndex);
          setAnswered(false);
          announce(questionScript(AUDIO_QUESTIONS[nextIndex], nextIndex));
        }
      }, NEXT_QUESTION_DELAY_MS);
    },
    [answered, finished, question, score, announce, isLast, index, finish, questionScript],
  );

  const commands: VoiceCommand[] = useMemo(() => {
    const optionCommands: VoiceCommand[] = LETTERS.map((letter, i) => ({
      // "option a" first so it outranks a bare "a" appearing inside other words.
      phrases: [`option ${letter.toLowerCase()}`, `answer ${letter.toLowerCase()}`, `number ${i + 1}`],
      description: `Answer ${letter}`,
      run: () => answerWith(i),
    }));
    return [
      ...optionCommands,
      {
        phrases: ["repeat", "again", "say again", "read question"],
        description: "Repeat the question",
        run: () => question && announce(questionScript(question, index)),
      },
      { phrases: ["stop", "be quiet"], description: "Stop reading", run: () => stopSpeaking() },
      { phrases: ["go back", "exit", "leave quiz"], description: "Leave the quiz", run: () => { stopSpeaking(); navigate("/dashboard/blind"); } },
    ];
  }, [answerWith, question, announce, questionScript, index, stopSpeaking, navigate]);

  const { listening, lastHeard, error: voiceError, supported, toggle } = useVoiceCommands(
    commands,
    !finished,
  );

  // Read the first question once, on arrival.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current || !question) return;
    startedRef.current = true;
    announce(
      `Voice quiz. ${AUDIO_QUESTIONS.length} questions. Turn on voice control, or use the buttons. ` +
        questionScript(question, 0),
    );
  }, [question, announce, questionScript]);

  if (finished) {
    return (
      <div className="min-h-screen bg-black text-white font-sans p-6">
        <div aria-live="assertive" aria-atomic="true" className="sr-only">
          {announcement}
        </div>
        <main className="max-w-2xl mx-auto text-center pt-16">
          <Trophy className="w-16 h-16 text-yellow-300 mx-auto mb-6" aria-hidden="true" />
          <h1 className="text-4xl font-bold text-yellow-300 mb-3">Quiz complete</h1>
          <p className="text-2xl text-white mb-8">
            You scored {score} out of {AUDIO_QUESTIONS.length}.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => speak(`You scored ${score} out of ${AUDIO_QUESTIONS.length}.`)}
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white text-black text-xl font-bold hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-yellow-300"
            >
              <Volume2 className="w-6 h-6" /> Read my score
            </button>
            <button
              onClick={() => navigate("/dashboard/blind")}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-yellow-400 text-black text-xl font-bold hover:bg-yellow-300 focus:outline-none focus:ring-4 focus:ring-white disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : null}
              Back to dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <header className="border-b-2 border-yellow-400/40 px-5 py-4 flex items-center justify-between gap-4">
        <button
          onClick={() => { stopSpeaking(); navigate("/dashboard/blind"); }}
          className="flex items-center gap-2 text-lg font-bold text-white hover:text-yellow-300 focus:outline-none focus:ring-4 focus:ring-yellow-300 rounded px-2 py-1"
        >
          <ArrowLeft className="w-6 h-6" /> Back
        </button>
        <p className="text-lg text-gray-200" role="status">
          Question {index + 1} of {AUDIO_QUESTIONS.length} · Score {score}
        </p>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => question && announce(questionScript(question, index))}
            className="flex-1 flex items-center justify-center gap-3 p-5 rounded-2xl bg-yellow-400 text-black text-xl font-bold hover:bg-yellow-300 focus:outline-none focus:ring-4 focus:ring-white"
          >
            <Volume2 className="w-7 h-7" /> Repeat question
          </button>
          <button
            onClick={() => { stopSpeaking(); setAnnouncement("Stopped reading."); }}
            className="flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-white text-black text-xl font-bold hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-yellow-300"
          >
            <Square className="w-6 h-6" /> Stop
          </button>
          <button
            onClick={toggle}
            aria-pressed={listening}
            disabled={!supported}
            className={`flex items-center justify-center gap-3 px-6 py-5 rounded-2xl text-xl font-bold focus:outline-none focus:ring-4 focus:ring-white disabled:opacity-50 ${
              listening ? "bg-red-500 text-white hover:bg-red-400" : "bg-yellow-400 text-black hover:bg-yellow-300"
            }`}
          >
            {listening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            {listening ? "Stop voice" : "Voice"}
          </button>
        </div>

        {!supported && (
          <p className="text-lg text-yellow-200 bg-yellow-950/60 border-2 border-yellow-700 rounded-xl p-4">
            Voice answering needs Chrome or Edge. You can answer with the buttons below or by
            pressing Tab then Enter.
          </p>
        )}
        {voiceError && (
          <p role="alert" className="text-lg text-red-200 bg-red-950/60 border-2 border-red-700 rounded-xl p-4">
            {voiceError}
          </p>
        )}
        {listening && (
          <p className="text-lg text-gray-200">
            Listening. {lastHeard ? `I heard: "${lastHeard}"` : 'Say "option A".'}
          </p>
        )}

        <section aria-labelledby="question-heading">
          <h1 id="question-heading" className="text-3xl font-bold text-yellow-300 mb-5">
            {question?.question}
          </h1>
          <ul className="space-y-3 list-none p-0">
            {question?.options.map((option, i) => (
              <li key={option}>
                <button
                  onClick={() => answerWith(i)}
                  disabled={answered}
                  className="w-full text-left p-5 rounded-2xl bg-gray-900 border-4 border-gray-700 text-2xl font-bold text-white hover:border-yellow-300 focus:outline-none focus:border-yellow-300 disabled:opacity-60"
                >
                  <span className="text-yellow-300 mr-3">Option {LETTERS[i]}</span>
                  {option}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-lg text-gray-400">
          Say &ldquo;option A&rdquo;, &ldquo;repeat&rdquo;, &ldquo;stop&rdquo;, or &ldquo;go back&rdquo;.
        </p>
      </main>
    </div>
  );
};

export default BlindQuizPage;
