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
  globalCommands: VoiceCommand[];
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

  const announce = useCallback(
    (text: string) => {
      if (!text) return;
      setAnnouncement(text);
      // The live region updates for screen-reader users regardless; speaking
      // is what needs the audio-nav switch, since a screen-reader user would
      // otherwise hear everything twice.
      if (enabled) {
        speak(text).then((spoke) => {
          if (spoke) {
            setUnlocked(true);
            sessionStorage.setItem(UNLOCK_KEY, 'true');
          }
        });
      }
    },
    [enabled, speak],
  );

  const readPage = useCallback(() => {
    const page = pageRef.current;
    const text = page
      ? `${page.title}. ${page.describe()}`
      : 'This screen has no audio description yet.';
    setAnnouncement(text);
    speak(text).then((spoke) => {
      if (spoke) {
        setUnlocked(true);
        sessionStorage.setItem(UNLOCK_KEY, 'true');
      }
    });
  }, [speak]);

  const registerPage = useCallback((summary: PageAudioSummary | null) => {
    pageRef.current = summary;
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
      { phrases: ['sign practice', 'practice signs', 'open sign practice'], description: 'Open sign practice', run: () => navigate('/practice/signs') },
      { phrases: ['read screen', 'read this page', 'where am i', 'what is on the screen'], description: 'Read this screen aloud', run: readPage },
      { phrases: ['repeat that', 'repeat'], description: 'Repeat the last thing said', run: () => speak(announcement) },
      { phrases: ['stop talking', 'stop reading', 'be quiet', 'stop'], description: 'Stop reading', run: () => stopSpeech() },
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

  const allCommands = useMemo(
    () => [...pageCommandsRef.current, ...globalCommands],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [globalCommands, pageCommandsVersion],
  );

  const {
    listening,
    supported: micSupported,
    toggle: toggleMic,
    start: startMic,
    stop: stopMic,
  } = useVoiceCommands(allCommands, enabled && !!token);

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

  const value: AudioNavigationContextType = {
    enabled: enabled && applicable,
    applicable,
    dismissed,
    unlocked: unlocked && !blocked,
    listening,
    micSupported,
    announce,
    readPage,
    stop: stopSpeech,
    toggleMic,
    setEnabled,
    registerPage,
    registerPageCommands,
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
