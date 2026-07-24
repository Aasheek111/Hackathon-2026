import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useAccessibility } from './AccessibilityContext';
import { useSpeech } from '../hooks/useSpeech';
import { useVoiceCommands, VoiceCommand } from '../hooks/useVoiceCommands';
import { homePathFor } from '../lib/homePath';

/**
 * App-wide audio navigation.
 *
 * THE PROBLEM THIS FIXES
 * ----------------------
 * The first version of the "blind dashboard" was a page full of large yellow
 * buttons - which is genuinely useful for LOW VISION, but useless to someone
 * who sees nothing: you cannot click "Read screen" if you cannot find "Read
 * screen". Audio support that lives on one page is not audio support; a
 * learner has to get to that page first, and then leaves it the moment they
 * open a lesson.
 *
 * So this lives at the app root instead. Every route announces itself, voice
 * commands work everywhere, and for a learner whose profile is BLINDNESS the
 * microphone starts on its own rather than waiting to be found and pressed.
 *
 * WHAT THIS IS NOT
 * ----------------
 * A screen reader. Most blind users already run NVDA, JAWS or VoiceOver, and
 * those are far better at this than we could be. Our real obligation is the
 * semantic HTML and ARIA that lets those tools work, which is why every page
 * still uses real headings, landmarks, labels and live regions. This layer is
 * a supplement: it helps a learner with no assistive tech installed (a shared
 * school machine, a borrowed phone), and it adds voice CONTROL, which screen
 * readers do not provide.
 */

interface AudioNavigationContextType {
  /** Audio navigation is switched on for this user. */
  enabled: boolean;
  /** False when audio navigation makes no sense for this profile (deaf). */
  applicable: boolean;
  /** The learner explicitly turned it off - don't re-offer it unprompted. */
  dismissed: boolean;
  /** The browser has let us play sound at least once. */
  unlocked: boolean;
  listening: boolean;
  /** The last phrase recognition returned - shown in the bar so a mismatch is visible without devtools. */
  lastHeard: string;
  /** Why voice control isn't working, when it isn't (unreachable service, blocked mic). */
  micError: string | null;
  micSupported: boolean;
  /** Speak text and mirror it into the app-wide live region. */
  announce: (text: string) => void;
  /** Read the current page's registered summary aloud. */
  readPage: () => void;
  stop: () => void;
  toggleMic: () => void;
  setEnabled: (on: boolean) => void;
  /** Pages call this (via usePageAudio) to say what they are. */
  registerPage: (summary: PageAudioSummary | null) => void;
  /** Extra voice commands contributed by the current page. */
  registerPageCommands: (commands: VoiceCommand[]) => void;
  /** The numbered things you can say/press on this screen right now. */
  numberedTargets: NumberedTarget[];
  /** A page can name its own numbered options instead of relying on auto-detection. */
  registerNumberedTargets: (targets: NumberedTarget[] | null) => void;
  globalCommands: VoiceCommand[];
}

export interface NumberedTarget {
  label: string;
  run: () => void;
}

export interface PageAudioSummary {
  /** Short name, announced on arrival: "My Progress". */
  title: string;
  /** Full description read by "read screen". Built lazily so it can include live data. */
  describe: () => string;
}

const AudioNavigationContext = createContext<AudioNavigationContextType | undefined>(undefined);

// Persisted so the audio unlock survives client-side navigation within a tab.
// sessionStorage rather than localStorage: browser autoplay permission is a
// per-tab, per-session thing, so remembering it across days would just produce
// a confident "sound is on" claim that turns out to be false on a cold load.
const UNLOCK_KEY = 'pragya_audio_unlocked';
const ENABLED_KEY = 'pragya_audio_nav_enabled';
// Set when the learner explicitly presses "Turn off". Distinct from
// ENABLED_KEY=false because it also suppresses the collapsed "turn it on"
// affordance - being offered again, immediately, by the thing you just
// dismissed is nagging. Settings keeps a permanent, findable toggle.
const DISMISSED_KEY = 'pragya_audio_nav_dismissed';
// Which profile the current on/off decision was made for, so changing your
// profile re-evaluates the default instead of being stuck with the old one.
const PROFILE_KEY = 'pragya_audio_nav_profile';

// Nine, because 1-9 are single keypresses and single spoken syllables. Past
// that a spoken menu stops being faster than tabbing.
const MAX_NUMBERED = 9;

// Recognition returns spoken numbers as digits ("one" -> "1"), so both forms
// are registered. Word-boundary matching in useVoiceCommands keeps "1" from
// firing on "11". Common mishearings are included deliberately.
const NUMBER_PHRASES: Record<number, string[]> = {
  1: ['1', 'one', 'won', 'number one', 'first'],
  2: ['2', 'two', 'to', 'too', 'number two', 'second'],
  3: ['3', 'three', 'number three', 'third'],
  4: ['4', 'four', 'for', 'number four', 'fourth'],
  5: ['5', 'five', 'number five', 'fifth'],
  6: ['6', 'six', 'number six', 'sixth'],
  7: ['7', 'seven', 'number seven', 'seventh'],
  8: ['8', 'eight', 'ate', 'number eight', 'eighth'],
  9: ['9', 'nine', 'number nine', 'ninth'],
};

/**
 * Finds the things worth numbering on whatever page is open.
 *
 * The alternative was hand-wiring a numbered menu into every page, which
 * guarantees the ones nobody remembers to update are the ones a blind learner
 * gets stranded on - exactly what happened on the classroom page. Scanning the
 * real DOM means every screen, including ones added later, is navigable by
 * number for free.
 *
 * Links come before buttons because on this app links are the destinations
 * (open a unit, open a lesson) while buttons tend to be secondary actions.
 */
function detectNumberedTargets(): NumberedTarget[] {
  if (typeof document === 'undefined') return [];
  const found: NumberedTarget[] = [];
  const seen = new Set<string>();

  const consider = (el: Element) => {
    if (found.length >= MAX_NUMBERED) return;
    // Never number our own controls - they have their own shortcuts.
    if (el.closest('[aria-label="Audio navigation controls"]')) return;
    const node = el as HTMLElement;
    if (node.hasAttribute('disabled') || node.getAttribute('aria-hidden') === 'true') return;
    // Skip anything not actually rendered (collapsed panels, sr-only skip links).
    if (!node.getClientRects().length) return;

    const label = (node.getAttribute('aria-label') || node.innerText || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!label || label.length > 80) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ label, run: () => node.click() });
  };

  // Sidebar/site navigation first, then the page's own content. That order
  // is deliberate: it means "1" is the same destination on every screen, so
  // the numbers are learnable rather than shifting under the learner - and
  // it fixes the classroom page appearing to have no navigation at all,
  // because its nav lives outside <main>.
  // <nav> before <aside>: the sidebar's <aside> starts with the logo and the
  // language toggle, so scanning it first made "1" mean "Switch to English"
  // on every screen. The <nav> inside it holds the actual destinations.
  const nav = document.querySelector('nav');
  const main = document.querySelector('main');
  const aside = document.querySelector('aside');
  nav?.querySelectorAll('a[href], button').forEach(consider);
  main?.querySelectorAll('a[href]').forEach(consider);
  main?.querySelectorAll('button').forEach(consider);
  aside?.querySelectorAll('a[href], button').forEach(consider);
  // Anything outside both (pages that use neither landmark).
  if (!found.length) {
    document.body.querySelectorAll('a[href], button').forEach(consider);
  }
  return found;
}

export const AudioNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, logout } = useAuth();
  const { prefs } = useAccessibility();
  const { speak, stop: stopSpeech, blocked } = useSpeech();

  const isBlindProfile = user?.disabilityType === 'BLINDNESS';

  // Audio navigation is pointless for a deaf learner - offering it, and
  // continuing to offer it after they dismiss it, is just noise in their way.
  const isDeafProfile = user?.disabilityType === 'DEAFNESS';
  const applicable = !isDeafProfile;

  // On by default for a blind learner; otherwise opt-in, remembered per tab.
  const [enabled, setEnabledState] = useState<boolean>(() => {
    const stored = sessionStorage.getItem(ENABLED_KEY);
    if (stored !== null) return stored === 'true';
    return false;
  });
  const [dismissed, setDismissed] = useState<boolean>(
    () => sessionStorage.getItem(DISMISSED_KEY) === 'true',
  );
  const [unlocked, setUnlocked] = useState<boolean>(
    () => sessionStorage.getItem(UNLOCK_KEY) === 'true',
  );
  const [announcement, setAnnouncement] = useState('');

  // Mic controls, captured into a ref because useVoiceCommands is called
  // further down the file than the speech helpers that need to pause it.
  const micRef = useRef<{ listening: boolean; start: () => void; stop: () => void }>({
    listening: false,
    start: () => {},
    stop: () => {},
  });
  const resumeMicAfterSpeechRef = useRef(false);
  // Mic was stopped because the tab went to the background, not by the learner.
  const hiddenPausedMicRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [numberedTargets, setNumberedTargets] = useState<NumberedTarget[]>([]);
  // Read by the "read navigation" command, so re-detecting targets doesn't
  // rebuild every global command each time.
  const numberedTargetsRef = useRef<NumberedTarget[]>([]);
  const explicitTargetsRef = useRef<NumberedTarget[] | null>(null);

  const pageRef = useRef<PageAudioSummary | null>(null);
  const pageCommandsRef = useRef<VoiceCommand[]>([]);
  const [pageCommandsVersion, setPageCommandsVersion] = useState(0);

  // Apply the right default for the CURRENT profile, and re-apply it whenever
  // the profile changes. Keyed on the profile the last decision was made for,
  // so switching (say) blindness -> deafness in Settings actually takes effect
  // instead of leaving the previous profile's choice stuck in sessionStorage,
  // and an explicit turn-off within one profile is still respected.
  useEffect(() => {
    if (!token) return;
    const profile = user?.disabilityType ?? 'NONE';
    const decidedFor = sessionStorage.getItem(PROFILE_KEY);
    if (decidedFor === profile) return;

    sessionStorage.setItem(PROFILE_KEY, profile);
    // A changed profile is a fresh decision - clear any previous dismissal.
    sessionStorage.removeItem(DISMISSED_KEY);
    setDismissed(false);

    const shouldEnable = profile === 'BLINDNESS';
    setEnabledState(shouldEnable);
    sessionStorage.setItem(ENABLED_KEY, String(shouldEnable));
    if (!shouldEnable) stopSpeech();
  }, [user?.disabilityType, token, stopSpeech]);

  const setEnabled = useCallback(
    (on: boolean) => {
      setEnabledState(on);
      sessionStorage.setItem(ENABLED_KEY, String(on));
      // Turning it off explicitly also stops us re-offering it for this
      // session; Settings is the permanent, findable way back on.
      sessionStorage.setItem(DISMISSED_KEY, String(!on));
      setDismissed(!on);
      if (!on) stopSpeech();
    },
    [stopSpeech],
  );

  /**
   * Speak, with the microphone closed for the duration.
   *
   * Half-duplex on purpose: a live microphone hears the synthesized voice
   * coming out of the speakers and tries to transcribe it, which both eats
   * the learner's actual command and fires spurious matches on our own
   * words. Every real voice assistant stops listening while it talks.
   *
   * The resume is belt-and-braces: onEnded fires normally, and a timeout
   * covers the case where speech fails outright and onEnded never arrives -
   * otherwise the microphone would stay shut for the rest of the session.
   */
  const speakThenListen = useCallback(
    async (text: string): Promise<boolean> => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      if (micRef.current.listening) {
        resumeMicAfterSpeechRef.current = true;
        micRef.current.stop();
      }
      const resume = () => {
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        if (resumeMicAfterSpeechRef.current) {
          resumeMicAfterSpeechRef.current = false;
          micRef.current.start();
        }
      };
      // Roughly how long this text takes to say, plus headroom.
      const guessMs = Math.min(60000, 1500 + text.length * 70);
      resumeTimerRef.current = setTimeout(resume, guessMs);

      const spoke = await speak(text, undefined, resume);
      if (!spoke) resume(); // nothing played - don't leave the mic shut
      return spoke;
    },
    [speak],
  );

  const announce = useCallback(
    (text: string) => {
      if (!text || user?.disabilityType === 'DEAFNESS') return;
      setAnnouncement(text);
      if (enabled) {
        speakThenListen(text).then((spoke) => {
          if (spoke) {
            setUnlocked(true);
            sessionStorage.setItem(UNLOCK_KEY, 'true');
          }
        });
      }
    },
    [enabled, speakThenListen, user?.disabilityType],
  );

  const readPage = useCallback(() => {
    const page = pageRef.current;
    // Point at the command instead of reciting every option. Reading nine
    // items on every single screen-read made the useful part - what the page
    // actually is - arrive far too late.
    const targets = numberedTargets.length
      ? ` There are ${numberedTargets.length} numbered options on this screen. ` +
        `Say "read navigation" to hear the numbers and what they do.`
      : '';
    const text =
      (page ? `${page.title}. ${page.describe()}` : 'This screen has no audio description yet.') +
      targets;
    setAnnouncement(text);
    speakThenListen(text).then((spoke) => {
      if (spoke) {
        setUnlocked(true);
        sessionStorage.setItem(UNLOCK_KEY, 'true');
      }
    });
  }, [speakThenListen, numberedTargets]);

  const registerPage = useCallback((summary: PageAudioSummary | null) => {
    pageRef.current = summary;
  }, []);

  const registerNumberedTargets = useCallback((targets: NumberedTarget[] | null) => {
    explicitTargetsRef.current = targets;
    if (targets) setNumberedTargets(targets.slice(0, MAX_NUMBERED));
  }, []);

  const registerPageCommands = useCallback((commands: VoiceCommand[]) => {
    pageCommandsRef.current = commands;
    setPageCommandsVersion((v) => v + 1);
  }, []);

  // --- global voice commands, available on every route ------------------
  const globalCommands: VoiceCommand[] = useMemo(
    () => [
      { phrases: ['go home', 'go to dashboard', 'open dashboard', 'home'], description: 'Go to your dashboard', run: () => navigate(homePathFor(user)) },
      { phrases: ['open lessons', 'my lessons', 'open classroom', 'classroom'], description: 'Open your classroom', run: () => navigate('/classroom') },
      { phrases: ['my progress', 'open progress'], description: 'Open your progress', run: () => navigate('/progress') },
      { phrases: ['open settings', 'settings'], description: 'Open settings', run: () => navigate('/settings') },
      {
        phrases: ['sign practice', 'practice signs', 'open sign practice'],
        description: 'Open sign practice',
        run: () => {
          if (user?.disabilityType === 'DEAFNESS') {
            navigate('/practice/signs');
          }
        },
      },
      { phrases: ['read screen', 'read this page', 'where am i', 'what is on the screen'], description: 'Read this screen aloud', run: readPage },
      { phrases: ['repeat that', 'repeat'], description: 'Repeat the last thing said', run: () => speak(announcement) },
      { phrases: ['stop talking', 'stop reading', 'be quiet', 'stop'], description: 'Stop reading', run: () => stopSpeech() },
      {
        phrases: ['read navigation', 'read numbers', 'what are the numbers', 'list navigation', 'navigation'],
        description: 'Hear what each number does on this screen',
        run: () => {
          const targets = numberedTargetsRef.current;
          if (!targets.length) {
            announce('This screen has no numbered options.');
            return;
          }
          announce(
            `${targets.length} numbered options. ` +
              targets.map((t, i) => `${i + 1}, ${t.label}`).join('. ') +
              '. Say the number, or press that number key.',
          );
        },
      },
      { phrases: ['go back'], description: 'Go back', run: () => navigate(-1) },
      { phrases: ['what can i say', 'help', 'list commands'], description: 'List voice commands', run: () => {
          const list = globalCommands.map((c) => c.phrases[0]).join(', ');
          announce(`You can say: ${list}.`);
        } },
      { phrases: ['log out', 'logout', 'sign out'], description: 'Log out', run: () => { stopSpeech(); logout(); navigate('/'); } },
    ],
    // globalCommands is self-referential in the help command; that's fine at
    // call time because the closure reads the built array, not the memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, user, readPage, speak, announcement, stopSpeech, logout, announce],
  );

  // "1".."9" for whatever this screen offers. Registered ahead of the page's
  // own commands so a page can still override a specific number if it needs to.
  const numberCommands: VoiceCommand[] = useMemo(
    () =>
      numberedTargets.map((target, i) => ({
        phrases: NUMBER_PHRASES[i + 1] ?? [String(i + 1)],
        description: `${i + 1} — ${target.label}`,
        run: () => {
          announce(`Opening ${target.label}`);
          target.run();
        },
      })),
    [numberedTargets, announce],
  );

  const allCommands = useMemo(
    () => [...pageCommandsRef.current, ...numberCommands, ...globalCommands],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [globalCommands, numberCommands, pageCommandsVersion],
  );

  const {
    listening,
    lastHeard,
    error: micError,
    supported: micSupported,
    toggle: toggleMic,
    start: startMic,
    stop: stopMic,
  } = useVoiceCommands(allCommands, enabled && !!token);

  // Kept current so speakThenListen (defined above) can pause/resume the mic.
  micRef.current = { listening, start: startMic, stop: stopMic };

  // "Keep the mic on for blind learners" - start it as soon as audio nav is
  // on and the browser has let us make a sound. Gating on `unlocked` matters:
  // asking for the microphone before the learner has interacted at all tends
  // to get the permission prompt dismissed, after which it is much harder to
  // ask again.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!enabled || !isBlindProfile || !micSupported || !unlocked) return;
    if (autoStartedRef.current || listening) return;
    autoStartedRef.current = true;
    startMic();
  }, [enabled, isBlindProfile, micSupported, unlocked, listening, startMic]);

  useEffect(() => {
    if (!enabled) stopMic();
  }, [enabled, stopMic]);

  // --- stop speech on every route change ---------------------------------
  // Whether or not audio navigation is enabled, any TTS or audio clip playing
  // when the user navigates should stop immediately - it belongs to the old
  // page and makes no sense on the new one.
  useEffect(() => {
    stopSpeech();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // --- announce every route change --------------------------------------
  // A sighted user sees the page changed. Without this, a blind user gets
  // silence and has to guess whether the command worked.
  const lastPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (lastPathRef.current === location.pathname) return;
    lastPathRef.current = location.pathname;
    // Let the new route mount and register its summary first.
    const timer = setTimeout(() => {
      const page = pageRef.current;
      if (page) announce(`${page.title}. ${page.describe()}`);
    }, 350);
    return () => clearTimeout(timer);
  }, [location.pathname, enabled, announce]);

  // Re-detect the numbered options after every navigation. Delayed so the
  // new route has actually rendered, and skipped when the page named its own.
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const rescan = () => {
      if (timer) clearTimeout(timer);
      // Debounced: a page that streams in data mutates many times, and only
      // the settled result is worth announcing.
      timer = setTimeout(() => {
        if (explicitTargetsRef.current) return;
        const next = detectNumberedTargets();
        setNumberedTargets((prev) => {
          const same =
            prev.length === next.length && prev.every((t, i) => t.label === next[i].label);
          return same ? prev : next;
        });
      }, 350);
    };

    rescan();
    // A fixed delay after navigation was not enough - pages fetch their data
    // after mount, so the scan kept catching the loading state and finding
    // one button. Watching the tree instead means the numbers appear as soon
    // as the real content does.
    const observer = new MutationObserver(rescan);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [location.pathname, enabled]);

  // Number keys, for when there is no microphone at all.
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > numberedTargets.length) return;
      e.preventDefault();
      const target = numberedTargets[n - 1];
      announce(`Opening ${target.label}`);
      target.run();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, numberedTargets, announce]);

  /**
   * Leaving the tab silences everything.
   *
   * Nothing here unmounts when a tab is backgrounded, so narration kept
   * talking and the microphone kept listening to a page nobody was on - which
   * is both startling (a voice from a tab you switched away from) and a live
   * microphone you did not ask for.
   *
   * The mic is only resumed if it was on because of visibility, not if the
   * learner had deliberately turned it off in the meantime.
   */
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        stopSpeech();
        if (micRef.current.listening) {
          resumeMicAfterSpeechRef.current = false; // not a speech pause - a real stop
          hiddenPausedMicRef.current = true;
          micRef.current.stop();
        }
      } else if (hiddenPausedMicRef.current) {
        hiddenPausedMicRef.current = false;
        if (enabled) micRef.current.start();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [enabled, stopSpeech]);

  // --- global keyboard shortcuts ----------------------------------------
  // Keyboard is the fallback that always works, including in browsers with no
  // speech recognition. Alt-based so they can't collide with typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const key = e.key.toLowerCase();
      if (key === 'r') {
        e.preventDefault();
        readPage();
      } else if (key === 's') {
        e.preventDefault();
        stopSpeech();
      } else if (key === 'v') {
        e.preventDefault();
        if (micSupported) toggleMic();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [readPage, stopSpeech, toggleMic, micSupported]);

  numberedTargetsRef.current = numberedTargets;

  const value: AudioNavigationContextType = {
    enabled: enabled && applicable,
    applicable,
    dismissed,
    unlocked: unlocked && !blocked,
    listening,
    lastHeard,
    micError,
    micSupported,
    announce,
    readPage,
    stop: stopSpeech,
    toggleMic,
    setEnabled,
    registerPage,
    registerPageCommands,
    numberedTargets,
    registerNumberedTargets,
    globalCommands,
  };

  return (
    <AudioNavigationContext.Provider value={value}>
      {/* One app-wide live region. Screen readers get every announcement here
          whether or not our own speech is switched on. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      {children}
    </AudioNavigationContext.Provider>
  );
};

export const useAudioNavigation = () => {
  const ctx = useContext(AudioNavigationContext);
  if (!ctx) throw new Error('useAudioNavigation must be used within an AudioNavigationProvider');
  return ctx;
};

/**
 * Registers what the current page is, so "read screen" and the on-arrival
 * announcement have something real to say. `describe` is called at read time,
 * so it can include data that loaded after mount.
 */
export function usePageAudio(title: string, describe: () => string) {
  const { registerPage } = useAudioNavigation();
  // Keep the latest describe closure without re-registering on every render.
  const describeRef = useRef(describe);
  describeRef.current = describe;

  useEffect(() => {
    registerPage({ title, describe: () => describeRef.current() });
    return () => registerPage(null);
  }, [title, registerPage]);
}

/** Contributes page-specific voice commands on top of the global set. */
export function usePageVoiceCommands(commands: VoiceCommand[]) {
  const { registerPageCommands } = useAudioNavigation();
  useEffect(() => {
    registerPageCommands(commands);
    return () => registerPageCommands([]);
  }, [commands, registerPageCommands]);
}

export default AudioNavigationContext;
