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

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; sample: string }[] = [
  { value: "SMALL", label: "Small", sample: "text-sm" },
  { value: "MEDIUM", label: "Medium", sample: "text-base" },
  { value: "LARGE", label: "Large", sample: "text-lg" },
  { value: "XLARGE", label: "Extra Large", sample: "text-xl" },
];

const DISABILITY_LABEL: Record<string, string> = {
  AUTISM: "Autism",
  BLINDNESS: "Blind / low vision",
  DEAFNESS: "Deaf / hard of hearing",
};

interface ToggleRowProps {
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ icon: Icon, title, description, checked, onChange }) => (
  <div className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-slate-200/80 bg-white">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div>
        <p className="font-bold text-sm text-slate-900">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
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

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: BookOpen, label: "My Classroom", path: "/classroom" },
    { icon: TrendingUp, label: "My Progress", path: "/progress" },
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
          <h1 className="text-3xl font-bold text-slate-900">Accessibility Settings</h1>
          <p className="text-slate-500 text-sm mt-1">
            Make Pragya fit the way you learn best. Changes apply instantly and are saved to your account.
          </p>
        </div>

        {user?.disabilityType && (
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
            <Check className="w-4 h-4 shrink-0" />
            <span>
              Your accessibility profile is set to <strong>{DISABILITY_LABEL[user.disabilityType] || user.disabilityType}</strong>{" "}
              — we used it to pick starting defaults below. Every setting is yours to change anytime.
            </span>
          </div>
        )}

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
                <span className="block text-[10px] font-bold mt-1 uppercase tracking-wide">{opt.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Toggles */}
        <section className="space-y-3">
          <ToggleRow
            icon={Contrast}
            title="High contrast mode"
            description="Bolder colors and stronger borders throughout your lessons, for easier reading."
            checked={prefs.highContrast}
            onChange={(v) => updatePrefs({ highContrast: v })}
          />
          <ToggleRow
            icon={Volume2}
            title="Always narrate lessons"
            description="Auto-play audio narration as soon as a lesson or storybook page opens, in any mode."
            checked={prefs.alwaysNarrate}
            onChange={(v) => updatePrefs({ alwaysNarrate: v })}
          />
          <ToggleRow
            icon={Headphones}
            title="Audiobook mode"
            description="Play a unit's lessons back-to-back like an audiobook, hands-free, instead of tapping Next every time."
            checked={prefs.audiobookMode}
            onChange={(v) => updatePrefs({ audiobookMode: v })}
          />
          <ToggleRow
            icon={Hand}
            title="Sign language mode"
            description="Show an ASL fingerspelling guide alongside key words in Storybook mode."
            checked={prefs.signLanguage}
            onChange={(v) => updatePrefs({ signLanguage: v })}
          />
          <ToggleRow
            icon={Wind}
            title="Reduced motion"
            description="Turn off page and reward animations that could be distracting or overwhelming."
            checked={prefs.reducedMotion}
            onChange={(v) => updatePrefs({ reducedMotion: v })}
          />
        </section>
      </motion.div>
    </DashboardShell>
  );
};

export default AccessibilitySettingsPage;
