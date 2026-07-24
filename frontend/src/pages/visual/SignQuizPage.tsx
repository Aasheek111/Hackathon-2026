import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Settings as SettingsIcon,
  Hand,
  ClipboardList,
  Check,
  X,
  Trophy,
  RotateCcw,
} from "lucide-react";
import DashboardShell, { NavItem } from "../../components/DashboardShell";
import HandshapeDiagram from "../../components/HandshapeDiagram";
import { handshapeFor } from "../../data/handshapes";
import { SIGNS, Sign } from "../../data/signLanguage";

/**
 * Visual practice quiz for the sign language section.
 *
 * Fully visual by construction: the prompt is a written description of a
 * handshape and the learner picks which sign it describes. Nothing here needs
 * hearing, and feedback is written rather than a sound cue.
 *
 * Questions are generated from the same SIGNS data the dictionary uses, so
 * the quiz can never drift out of sync with what was taught.
 */

const QUESTION_COUNT = 10;
const OPTIONS_PER_QUESTION = 4;

interface SignQuestion {
  sign: Sign;
  options: Sign[];
}

/** Fisher-Yates - unbiased, unlike the sort(() => Math.random() - 0.5) shuffle. */
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildQuiz(): SignQuestion[] {
  return shuffle(SIGNS)
    .slice(0, QUESTION_COUNT)
    .map((sign) => {
      // Distractors come from the SAME category where possible, so the answer
      // can't be guessed just by noticing the odd one out.
      const sameCategory = SIGNS.filter((s) => s.id !== sign.id && s.category === sign.category);
      const pool = sameCategory.length >= OPTIONS_PER_QUESTION - 1
        ? sameCategory
        : SIGNS.filter((s) => s.id !== sign.id);
      return {
        sign,
        options: shuffle([...shuffle(pool).slice(0, OPTIONS_PER_QUESTION - 1), sign]),
      };
    });
}

export const SignQuizPage: React.FC = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<SignQuestion[]>(() => buildQuiz());
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/visual" },
    { icon: Hand, label: "Sign Language", path: "/dashboard/visual/sign-language" },
    { icon: ClipboardList, label: "Sign Quiz", path: "/dashboard/visual/sign-quiz", active: true },
    { icon: BookOpen, label: "My Classroom", path: "/classroom" },
    { icon: TrendingUp, label: "My Progress", path: "/progress" },
    { icon: SettingsIcon, label: "Settings", path: "/settings" },
  ];

  const question = questions[index];
  const correct = selected !== null && selected === question?.sign.id;

  const choose = useCallback(
    (id: string) => {
      if (selected !== null) return;
      setSelected(id);
      if (id === question.sign.id) setScore((s) => s + 1);
    },
    [selected, question],
  );

  const next = useCallback(() => {
    if (index >= questions.length - 1) setFinished(true);
    else {
      setIndex((i) => i + 1);
      setSelected(null);
    }
  }, [index, questions.length]);

  const restart = useCallback(() => {
    setQuestions(buildQuiz());
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  }, []);

  const percent = useMemo(
    () => Math.round((score / questions.length) * 100),
    [score, questions.length],
  );

  if (finished) {
    return (
      <DashboardShell navItems={navItems}>
        <div className="max-w-lg mx-auto text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs p-10 mt-8">
          <Trophy className="w-14 h-14 text-amber-500 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Quiz complete</h1>
          <p className="text-slate-500 text-sm mb-4">
            You got <strong className="text-slate-900">{score}</strong> of {questions.length} correct
            ({percent}%).
          </p>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={restart}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold"
            >
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
            <button
              onClick={() => navigate("/dashboard/visual/sign-language")}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-bold"
            >
              Back to lessons
            </button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell navItems={navItems}>
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Sign Quiz</h1>
          <p className="text-xs font-bold text-slate-500" role="status">
            Question {index + 1} of {questions.length} · Score {score}
          </p>
        </div>

        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Which sign is this?
          </p>
          <div className="flex items-start gap-4">
            {/* Letters and numbers get the handshape diagram, making this a
                real visual recognition test rather than a reading test. */}
            {handshapeFor(question.sign.term) && (
              <div className="shrink-0 rounded-2xl bg-emerald-50 border border-emerald-200 p-2">
                <HandshapeDiagram term={question.sign.term} size={110} />
              </div>
            )}
            <div>
              <p className="text-lg text-slate-800 leading-relaxed">{question.sign.description}</p>
              <p className="text-xs text-slate-500 mt-2">Category: {question.sign.category}</p>
            </div>
          </div>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 list-none p-0">
          {question.options.map((option) => {
            const isChosen = selected === option.id;
            const isAnswer = option.id === question.sign.id;
            let tone = "border-slate-200 bg-white hover:border-emerald-400 text-slate-700";
            if (selected !== null) {
              if (isAnswer) tone = "border-emerald-500 bg-emerald-50 text-emerald-900";
              else if (isChosen) tone = "border-rose-400 bg-rose-50 text-rose-900";
              else tone = "border-slate-200 bg-white text-slate-400";
            }
            return (
              <li key={option.id}>
                <button
                  onClick={() => choose(option.id)}
                  disabled={selected !== null}
                  className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-sm font-bold transition-all flex items-center justify-between gap-2 ${tone}`}
                >
                  <span>{option.term}</span>
                  {selected !== null && isAnswer && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
                  {selected !== null && isChosen && !isAnswer && <X className="w-4 h-4 shrink-0" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Written feedback, announced for screen readers. No sound cue -
            nothing in this quiz may depend on hearing. */}
        <div aria-live="polite" aria-atomic="true">
          {selected !== null && (
            <div
              className={`rounded-2xl border p-4 ${
                correct ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
              }`}
            >
              <p className={`text-sm font-bold ${correct ? "text-emerald-900" : "text-amber-900"}`}>
                {correct ? "Correct!" : `Not quite — that was "${question.sign.term}".`}
              </p>
              {question.sign.tip && (
                <p className="text-xs text-slate-600 mt-1">💡 {question.sign.tip}</p>
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
      </div>
    </DashboardShell>
  );
};

export default SignQuizPage;
