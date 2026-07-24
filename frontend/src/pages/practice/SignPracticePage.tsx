import React, { useCallback, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Settings as SettingsIcon,
  Hand,
  Check,
  X,
  RotateCcw,
  Trophy,
  Eye,
  Keyboard,
} from "lucide-react";
import DashboardShell, { NavItem } from "../../components/DashboardShell";
import SignSymbol from "../../components/SignSymbol";
import { useAuth } from "../../contexts/AuthContext";
import { useAccessibility } from "../../contexts/AccessibilityContext";
import { usePageAudio } from "../../contexts/AudioNavigationContext";
import { homePathFor } from "../../lib/homePath";
import { ASL_ALPHABET } from "../../data/aslAlphabet";

/**
 * Fingerspelling practice: A-Z and 1-10.
 *
 * Open to EVERY learner, not just deaf ones, and deliberately reachable from
 * every dashboard. That is the inclusive-education point in miniature: sign
 * language is a subject anyone can learn, and a hearing classmate who can
 * fingerspell is worth more to a deaf learner than any feature we could ship.
 * Segregating it behind the "deaf dashboard" would have taught the opposite.
 *
 * Two directions, because recognising a sign and producing one are different
 * skills:
 *   - See the sign, name the letter  (recognition)
 *   - See the letter, pick the sign  (recall)
 */

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUMBERS = Array.from({ length: 10 }, (_, i) => String(i + 1));

type Deck = "letters" | "numbers" | "both";
type Direction = "signToTerm" | "termToSign";

const DECKS: { id: Deck; label: string; terms: () => string[] }[] = [
  { id: "letters", label: "Letters A–Z", terms: () => LETTERS },
  { id: "numbers", label: "Numbers 1–10", terms: () => NUMBERS },
  { id: "both", label: "Everything", terms: () => [...LETTERS, ...NUMBERS] },
];

const OPTION_COUNT = 4;

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface Question {
  answer: string;
  options: string[];
}

function buildRound(terms: string[], count: number): Question[] {
  return shuffle(terms)
    .slice(0, count)
    .map((answer) => {
      const distractors = shuffle(terms.filter((t) => t !== answer)).slice(0, OPTION_COUNT - 1);
      return { answer, options: shuffle([...distractors, answer]) };
    });
}

export const SignPracticePage: React.FC = () => {
  const { user } = useAuth();
  const isDeafUser = user?.disabilityType === "DEAFNESS";

  if (!isDeafUser) {
    return <Navigate to={homePathFor(user)} replace />;
  }

  const [deck, setDeck] = useState<Deck>("letters");
  const [direction, setDirection] = useState<Direction>("signToTerm");
  const [questions, setQuestions] = useState<Question[]>(() => buildRound(LETTERS, 10));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  // Study mode is the default landing state - drilling someone on signs they
  // have never seen is a test, not teaching.
  const [mode, setMode] = useState<"study" | "quiz">("study");

  const deckTerms = useMemo(() => DECKS.find((d) => d.id === deck)!.terms(), [deck]);
  const question = questions[index];

  usePageAudio("Sign practice", () =>
    mode === "study"
      ? `Study the American Sign Language alphabet and numbers. Currently showing ${deckTerms.length} signs from ${DECKS.find((d) => d.id === deck)!.label}. Each card shows a hand diagram and a written description of how to form it. Switch to quiz mode to test yourself.`
      : `Sign quiz, question ${index + 1} of ${questions.length}. Score ${score}. ${
          direction === "signToTerm"
            ? "A hand diagram is shown; choose which letter or number it is."
            : "A letter is shown; choose the matching hand diagram."
        }`,
  );

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: homePathFor(user) },
    { icon: Hand, label: "Sign Practice", path: "/practice/signs", active: true },
    { icon: BookOpen, label: "My Classroom", path: "/classroom" },
    { icon: TrendingUp, label: "My Progress", path: "/progress" },
    { icon: SettingsIcon, label: "Settings", path: "/settings" },
  ];

  const startQuiz = useCallback(
    (nextDeck: Deck = deck, nextDirection: Direction = direction) => {
      const terms = DECKS.find((d) => d.id === nextDeck)!.terms();
      setQuestions(buildRound(terms, 10));
      setIndex(0);
      setSelected(null);
      setScore(0);
      setFinished(false);
      setMode("quiz");
      setDeck(nextDeck);
      setDirection(nextDirection);
    },
    [deck, direction],
  );

  const choose = (value: string) => {
    if (selected !== null) return;
    setSelected(value);
    if (value === question.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (index >= questions.length - 1) setFinished(true);
    else {
      setIndex((i) => i + 1);
      setSelected(null);
    }
  };

  // --- finished ---------------------------------------------------------
  if (mode === "quiz" && finished) {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <DashboardShell navItems={navItems}>
        <div className="max-w-lg mx-auto text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs p-10 mt-8">
          <Trophy className="w-14 h-14 text-amber-500 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Practice complete</h1>
          <p className="text-slate-600 text-sm mb-4" role="status">
            You got <strong className="text-slate-900">{score}</strong> of {questions.length} correct
            ({percent}%).
          </p>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => startQuiz()}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" /> Practice again
            </button>
            <button
              onClick={() => setMode("study")}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-bold"
            >
              Back to study
            </button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell navItems={navItems}>
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sign Practice</h1>
          <p className="text-slate-600 text-sm mt-1">
            The American Sign Language alphabet and numbers — open to everyone. Learning to
            fingerspell is one of the most useful things a hearing classmate can do.
          </p>
        </div>

        {/* Study / quiz switch */}
        <div role="tablist" aria-label="Practice mode" className="flex gap-2">
          <button
            role="tab"
            aria-selected={mode === "study"}
            onClick={() => setMode("study")}
            className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full border transition-all ${
              mode === "study"
                ? "bg-emerald-500 text-white border-emerald-500"
                : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
            }`}
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" /> Study
          </button>
          <button
            role="tab"
            aria-selected={mode === "quiz"}
            onClick={() => startQuiz()}
            className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full border transition-all ${
              mode === "quiz"
                ? "bg-emerald-500 text-white border-emerald-500"
                : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400"
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" aria-hidden="true" /> Quiz me
          </button>
        </div>

        {/* Deck picker */}
        <div role="radiogroup" aria-label="Which signs to practice" className="flex flex-wrap gap-2">
          {DECKS.map((d) => {
            const active = deck === d.id;
            return (
              <button
                key={d.id}
                role="radio"
                aria-checked={active}
                onClick={() => (mode === "quiz" ? startQuiz(d.id) : setDeck(d.id))}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>

        {mode === "study" ? (
          <>
            <p className="text-xs text-slate-600" role="status">
              {deckTerms.length} signs. Each shows a hand diagram and how to form it.
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 list-none p-0">
              {deckTerms.map((term) => (
                <li
                  key={term}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3 flex flex-col items-center text-center"
                >
                  <SignSymbol term={term} size={88} />
                  <p className="text-lg font-bold text-slate-900 mt-1">{term}</p>
                  {ASL_ALPHABET[term] && (
                    <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                      {ASL_ALPHABET[term]}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            {/* Direction switch - recognition vs recall */}
            <div role="radiogroup" aria-label="Question direction" className="flex flex-wrap gap-2">
              <button
                role="radio"
                aria-checked={direction === "signToTerm"}
                onClick={() => startQuiz(deck, "signToTerm")}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                  direction === "signToTerm"
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-white text-slate-700 border-slate-200 hover:border-sky-400"
                }`}
              >
                See the sign → name it
              </button>
              <button
                role="radio"
                aria-checked={direction === "termToSign"}
                onClick={() => startQuiz(deck, "termToSign")}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                  direction === "termToSign"
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-white text-slate-700 border-slate-200 hover:border-sky-400"
                }`}
              >
                See the letter → pick the sign
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-bold text-slate-600" role="status">
                Question {index + 1} of {questions.length} · Score {score}
              </p>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${((index + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Prompt */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 text-center">
              {direction === "signToTerm" ? (
                <>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                    Which letter or number is this sign?
                  </p>
                  <SignSymbol term={question.answer} size={150} className="mx-auto" />
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                    Which sign means this?
                  </p>
                  <p className="text-6xl font-bold text-slate-900">{question.answer}</p>
                </>
              )}
            </div>

            {/* Options */}
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 list-none p-0">
              {question.options.map((option) => {
                const isChosen = selected === option;
                const isAnswer = option === question.answer;
                let tone = "border-slate-200 bg-white hover:border-emerald-400 text-slate-800";
                if (selected !== null) {
                  if (isAnswer) tone = "border-emerald-500 bg-emerald-50 text-emerald-900";
                  else if (isChosen) tone = "border-rose-400 bg-rose-50 text-rose-900";
                  else tone = "border-slate-200 bg-white text-slate-500";
                }
                return (
                  <li key={option}>
                    <button
                      onClick={() => choose(option)}
                      disabled={selected !== null}
                      aria-label={
                        direction === "signToTerm"
                          ? `Answer ${option}`
                          : `The sign for ${option}`
                      }
                      className={`w-full p-3 rounded-2xl border-2 font-bold transition-all flex flex-col items-center gap-1 ${tone}`}
                    >
                      {direction === "signToTerm" ? (
                        <span className="text-2xl">{option}</span>
                      ) : (
                        <SignSymbol term={option} size={72} showMotion={false} />
                      )}
                      {selected !== null && isAnswer && (
                        <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                      )}
                      {selected !== null && isChosen && !isAnswer && (
                        <X className="w-4 h-4 text-rose-500" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div aria-live="polite" aria-atomic="true">
              {selected !== null && (
                <div
                  className={`rounded-2xl border p-4 ${
                    selected === question.answer
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <p
                    className={`text-sm font-bold ${
                      selected === question.answer ? "text-emerald-900" : "text-amber-900"
                    }`}
                  >
                    {selected === question.answer
                      ? "Correct!"
                      : `Not quite — that was ${question.answer}.`}
                  </p>
                  {ASL_ALPHABET[question.answer] && (
                    <p className="text-xs text-slate-700 mt-1">
                      <strong>{question.answer}:</strong> {ASL_ALPHABET[question.answer]}
                    </p>
                  )}
                  <button
                    onClick={next}
                    className="mt-3 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold"
                  >
                    {index >= questions.length - 1 ? "See my score" : "Next question"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        <p className="text-xs text-slate-600">
          Want more than the alphabet?{" "}
          <Link to="/dashboard/visual/sign-language" className="text-emerald-700 font-bold underline">
            Browse the full sign dictionary
          </Link>{" "}
          for everyday words, school words and feelings.
        </p>
      </div>
    </DashboardShell>
  );
};

export default SignPracticePage;
