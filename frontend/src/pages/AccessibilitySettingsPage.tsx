import React from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Settings as SettingsIcon,
  Type,
  Contrast,
  Volume2,
  Wind,
  Hand,
  Headphones,
  Check,
} from "lucide-react";
import DashboardShell, { NavItem } from "../components/DashboardShell";
import { useAuth } from "../contexts/AuthContext";
import { useAccessibility, FontSize } from "../contexts/AccessibilityContext";
import { DISABILITY_PROFILES } from "../data/disabilityProfiles";
import {
  usePageAudio,
  useAudioNavigation,
} from "../contexts/AudioNavigationContext";

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; sample: string }[] =
  [
    { value: "SMALL", label: "Small", sample: "text-sm" },
    { value: "MEDIUM", label: "Medium", sample: "text-base" },
    { value: "LARGE", label: "Large", sample: "text-lg" },
    { value: "XLARGE", label: "Extra Large", sample: "text-xl" },
  ];

interface ToggleRowProps {
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}) => (
  <div className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-slate-200/80 bg-white">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div>
        <p className="font-bold text-sm text-slate-900">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={title}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
        checked ? "bg-emerald-500" : "bg-slate-200"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  </div>
);

export const AccessibilitySettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { prefs, updatePrefs, loading } = useAccessibility();
  const {
    enabled: audioEnabled,
    applicable: audioApplicable,
    setEnabled: setAudioEnabled,
  } = useAudioNavigation();
  const [savingProfile, setSavingProfile] = React.useState(false);

  usePageAudio(
    "Accessibility Settings",
    () =>
      `Change how Pragya works for you. Your accessibility profile is ${user?.disabilityType ?? "not set"}. ` +
      `Text size is ${prefs.fontSize.toLowerCase()}. ` +
      `High contrast is ${prefs.highContrast ? "on" : "off"}. ` +
      `Audiobook mode is ${prefs.audiobookMode ? "on" : "off"}. ` +
      `Sign language mode is ${prefs.signLanguage ? "on" : "off"}. ` +
      `Reduced motion is ${prefs.reducedMotion ? "on" : "off"}.`,
  );

  const isDeafUser = user?.disabilityType === "DEAFNESS";

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: BookOpen, label: "My Classroom", path: "/classroom" },
    { icon: TrendingUp, label: "My Progress", path: "/progress" },
    ...(isDeafUser
      ? [{ icon: Hand, label: "Sign Practice", path: "/practice/signs" }]
      : []),
    { icon: SettingsIcon, label: "Settings", path: "/settings", active: true },
  ];

  return (
    <DashboardShell navItems={navItems}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Accessibility Settings
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Make Pragya fit the way you learn best. Changes apply instantly and
            are saved to your account.
          </p>
        </div>

        {/* Accessibility profile - editable here, not just at registration.
            Changing it switches which dashboard you land on AND re-applies
            that profile's sensible defaults (see the backend route), so it's
            confirmed before saving rather than firing on a stray click. */}
        <section className="p-5 rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <Check className="w-4.5 h-4.5 text-emerald-600" />
            <h2 className="font-bold text-slate-900 text-sm">
              Accessibility profile
            </h2>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Changing this switches your dashboard and turns on the settings that
            profile usually needs. You can still adjust everything below
            afterwards.
          </p>
          <div
            role="radiogroup"
            aria-label="Accessibility profile"
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
          >
            {DISABILITY_PROFILES.map((opt) => {
              const current = (user?.disabilityType ?? null) === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  role="radio"
                  aria-checked={current}
                  disabled={loading || savingProfile}
                  onClick={() => {
                    if (current) return;
                    if (
                      !window.confirm(
                        `Switch your profile to "${opt.label}"?\n\nThis opens the ${opt.dashboard} and turns on the settings that profile usually needs.`,
                      )
                    )
                      return;
                    setSavingProfile(true);
                    updatePrefs({ disabilityType: opt.value }).finally(() =>
                      setSavingProfile(false),
                    );
                  }}
                  className={`text-left p-3 rounded-xl border-2 transition-all disabled:opacity-60 ${
                    current
                      ? "border-emerald-500 bg-emerald-50 shadow-xs"
                      : "border-slate-200 bg-[#FAF9F5] hover:border-slate-300"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-bold ${current ? "text-emerald-900" : "text-slate-700"}`}
                    >
                      {opt.label}
                    </span>
                    {current && (
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide shrink-0">
                        Current
                      </span>
                    )}
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-1 leading-snug">
                    {opt.blurb}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Font size */}
        <section className="p-5 rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Type className="w-4.5 h-4.5 text-emerald-600" />
            <h2 className="font-bold text-slate-900 text-sm">Text size</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {FONT_SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={loading}
                onClick={() => updatePrefs({ fontSize: opt.value })}
                className={`p-3 rounded-xl border-2 transition-all text-center ${
                  prefs.fontSize === opt.value
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs"
                    : "border-slate-200 bg-[#FAF9F5] text-slate-600 hover:border-slate-300"
                }`}
              >
                <span className={`block font-bold ${opt.sample}`}>Aa</span>
                <span className="block text-[10px] font-bold mt-1 uppercase tracking-wide">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </section>
      </motion.div>
    </DashboardShell>
  );
};

export default AccessibilitySettingsPage;
