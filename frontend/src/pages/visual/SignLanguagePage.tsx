import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Settings as SettingsIcon,
  Hand,
  ClipboardList,
  Search,
  Star,
  Info,
  ArrowRight,
} from "lucide-react";
import DashboardShell, { NavItem } from "../../components/DashboardShell";
import AiAssistantPanel from "../../components/AiAssistantPanel";
import SignSymbol from "../../components/SignSymbol";
import { handshapeFor } from "../../data/handshapes";
import {
  SIGNS,
  SIGN_CATEGORIES,
  SIGN_SYSTEMS,
  SignCategory,
  SignSystemId,
  Sign,
  signsInCategory,
  searchSigns,
} from "../../data/signLanguage";
import useSignFavourites from "../../hooks/useSignFavourites";
import { NSL_SOURCES, NSL_UNDOCUMENTED, NSL_DOCUMENTED_COUNT } from "../../data/nepaliSignLanguage";

/**
 * Sign language learning + dictionary for the deaf dashboard.
 *
 * Browse by category, search the whole set, and star signs to build a
 * personal list. Each card shows how the sign is formed in words, plus a
 * memory hook where one exists - see signLanguage.ts for why this is text
 * rather than video, and where licensed media would slot in.
 */

const SignCard: React.FC<{
  sign: Sign;
  isFavourite: boolean;
  onToggleFavourite: (id: string) => void;
}> = ({ sign, isFavourite, onToggleFavourite }) => (
  <li className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex gap-3">
    {/* Alphabet and number signs get a schematic handshape diagram; words
        don't, because a single static hand can't honestly represent a sign
        with movement (see handshapes.ts). Those keep the hand glyph. */}
    {handshapeFor(sign.term) ? (
      <div className="shrink-0 rounded-xl bg-emerald-50 border border-emerald-200 p-1">
        <SignSymbol term={sign.term} size={64} showMotion={false} />
      </div>
    ) : (
      <div className="w-12 h-12 shrink-0 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
        <Hand className="w-5 h-5 text-emerald-800" aria-hidden="true" />
      </div>
    )}
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-2">
        {/* Not a heading: these are <li> items in a list, which already
            gives screen-reader users a navigable structure - a heading per
            card (up to 65 of them) would just add heading-navigation noise,
            and it was ranking above the page's own <h2>s besides. */}
        <p className="font-bold text-slate-900 text-sm">{sign.term}</p>
        <button
          type="button"
          onClick={() => onToggleFavourite(sign.id)}
          aria-pressed={isFavourite}
          aria-label={isFavourite ? `Remove ${sign.term} from favourites` : `Save ${sign.term} to favourites`}
          className="shrink-0 p-1 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <Star
            className={`w-4 h-4 ${isFavourite ? "fill-amber-400 text-amber-500" : "text-slate-300"}`}
            aria-hidden="true"
          />
        </button>
      </div>
      {/* mediaUrl is rendered when a licensed sign media set is configured;
          until then the written description is the content, not a placeholder. */}
      {sign.mediaUrl && (
        <img
          src={sign.mediaUrl}
          alt={`Demonstration of the sign for ${sign.term}`}
          className="w-full rounded-lg my-2 bg-slate-100"
        />
      )}
      {sign.description === NSL_UNDOCUMENTED ? (
        <p className="text-xs text-amber-800 italic leading-relaxed mt-0.5">{sign.description}</p>
      ) : (
        <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{sign.description}</p>
      )}
      {sign.tip && <p className="text-[11px] text-emerald-800 bg-emerald-50 rounded-lg px-2 py-1 mt-1.5">💡 {sign.tip}</p>}
    </div>
  </li>
);

export const SignLanguagePage: React.FC = () => {
  const [category, setCategory] = useState<SignCategory | "Favourites">("Alphabet");
  const [query, setQuery] = useState("");
  const { favourites, toggleFavourite } = useSignFavourites();
  const [systemId, setSystemId] = useState<SignSystemId>("ASL");
  const system = SIGN_SYSTEMS.find((s) => s.id === systemId)!;

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard/visual" },
    { icon: Hand, label: "Sign Language", path: "/dashboard/visual/sign-language", active: true },
    { icon: ClipboardList, label: "Sign Quiz", path: "/dashboard/visual/sign-quiz" },
    { icon: BookOpen, label: "My Classroom", path: "/classroom" },
    { icon: TrendingUp, label: "My Progress", path: "/progress" },
  ];

  // Search wins over the category tabs when there's a query - a learner
  // typing a word wants it found wherever it lives, not filtered to the tab
  // they happen to be on.
  const visible = useMemo(() => {
    if (!system.available) return [];
    if (query.trim()) return searchSigns(query, systemId);
    if (category === "Favourites")
      return SIGNS.filter((s) => s.system === systemId && favourites.includes(s.id));
    return signsInCategory(category, systemId);
  }, [query, category, favourites, systemId, system.available]);

  return (
    <DashboardShell navItems={navItems}>
      <div className="max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sign Language</h1>
          <p className="text-slate-500 text-sm mt-1">
            Learn the alphabet, numbers, and everyday words. Star any sign to save it.
          </p>
        </div>

        {/* Sign languages are separate languages, not translations of each
            other - so this is a language picker, not a locale switch. */}
        <div>
          <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Sign language
          </span>
          <div role="radiogroup" aria-label="Sign language" className="flex flex-wrap gap-2">
            {SIGN_SYSTEMS.map((s) => {
              const active = systemId === s.id;
              return (
                <button
                  key={s.id}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSystemId(s.id)}
                  className={`text-left px-3 py-2 rounded-xl border-2 transition-all ${
                    active
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className={`block text-xs font-bold ${active ? "text-emerald-900" : "text-slate-700"}`}>
                    {s.label}
                    {!s.available && (
                      <span className="ml-1.5 text-[10px] font-bold text-amber-700">Coming soon</span>
                    )}
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    {s.nativeLabel ? `${s.nativeLabel} · ` : ""}
                    {s.region}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Being straight with the learner about what these cards are.
            Each language gets its own honest caveat - they are different. */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          {systemId === "ASL" ? (
            <p className="text-xs text-amber-900 leading-relaxed">
              Letters and numbers show a <strong>schematic hand diagram</strong> — which fingers are up,
              curled or folded — alongside a written description. They are drawn from the standard ASL
              manual alphabet, <strong>not photos or video</strong>, and cannot show movement, wrist
              angle, or facial expression, which are all real parts of signing. Words with movement
              show the description only. For live practice, work with a qualified ASL tutor or a Deaf
              mentor.
            </p>
          ) : (
            <div className="text-xs text-amber-900 leading-relaxed">
              <p>
                This is the <strong>full Nepali manual alphabet</strong> — every vowel, consonant and
                numeral it fingerspells. The character list is sourced, but only{" "}
                <strong>{NSL_DOCUMENTED_COUNT} of {visible.length || "the"} handshapes</strong> are
                documented here.
              </p>
              <p className="mt-1.5">
                NSL handshapes are <strong>indigenous</strong> — apart from अ, ब, म and र they are not
                derived from ASL, so they cannot be inferred from it. Rather than invent the rest and
                risk teaching a deaf child a wrong sign, undocumented characters say so. To learn them
                properly, use:
              </p>
              <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
                {NSL_SOURCES.map((src) => (
                  <li key={src.label}>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold underline hover:text-amber-950"
                    >
                      {src.label}
                    </a>{" "}
                    — {src.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* An honest empty state beats a fabricated catalogue. */}
        {!system.available ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8 text-center">
            <Hand className="w-10 h-10 text-slate-300 mx-auto mb-3" aria-hidden="true" />
            <h2 className="font-bold text-slate-900 mb-2">
              {system.label}
              {system.nativeLabel ? ` (${system.nativeLabel})` : ""} is not available yet
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-xl mx-auto">
              {system.unavailableReason}
            </p>
            <button
              onClick={() => setSystemId("ASL")}
              className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold"
            >
              Browse American Sign Language instead
            </button>
          </div>
        ) : (
          <>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
          <label htmlFor="sign-search" className="sr-only">
            Search all signs
          </label>
          <input
            id="sign-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search signs, e.g. thank you"
            className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {!query.trim() && (
          <div role="tablist" aria-label="Sign categories" className="flex flex-wrap gap-2">
            {[...SIGN_CATEGORIES, "Favourites" as const].map((cat) => {
              const active = category === cat;
              const count =
                cat === "Favourites"
                    ? SIGNS.filter((s) => s.system === systemId && favourites.includes(s.id)).length
                    : signsInCategory(cat as SignCategory, systemId).length;
              return (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategory(cat)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                    active
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400"
                  }`}
                >
                  {cat} <span className={active ? "text-emerald-100" : "text-slate-500"}>({count})</span>
                </button>
              );
            })}
          </div>
        )}

        <p className="text-xs text-slate-500" role="status">
          {query.trim()
            ? `${visible.length} result${visible.length === 1 ? "" : "s"} for "${query.trim()}"`
            : `${visible.length} sign${visible.length === 1 ? "" : "s"} in ${category}`}
        </p>

        {visible.length === 0 ? (
          <p className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8 text-center text-sm text-slate-500">
            {category === "Favourites" && !query.trim()
              ? "No saved signs yet. Tap the star on any sign to save it here."
              : "No signs matched that search."}
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 list-none p-0">
            {visible.map((sign) => (
              <SignCard
                key={sign.id}
                sign={sign}
                isFavourite={favourites.includes(sign.id)}
                onToggleFavourite={toggleFavourite}
              />
            ))}
          </ul>
        )}

        <Link
          to="/dashboard/visual/sign-quiz"
          className="group flex items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200 shrink-0">
              <ClipboardList className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Ready to practice?</p>
              <p className="text-xs text-slate-500 mt-0.5">Take the sign quiz and check what stuck.</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0" />
        </Link>
          </>
        )}

        <AiAssistantPanel context="The learner is studying American Sign Language: the manual alphabet, numbers, and everyday vocabulary such as greetings, school words and feelings." />
      </div>
    </DashboardShell>
  );
};

export default SignLanguagePage;
