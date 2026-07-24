import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders,
  Type,
  Contrast,
  Languages,
  Palette,
  X,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useAccessibility, FontSize, AppTheme } from "../contexts/AccessibilityContext";
import LanguageToggle from "./LanguageToggle";

export const FloatingAccessibilityToolkit: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { prefs, updatePrefs, resetPrefs } = useAccessibility();

  const fontSizes: { value: FontSize; label: string; tag: string }[] = [
    { value: "SMALL", label: "Small", tag: "A-" },
    { value: "MEDIUM", label: "Med", tag: "A" },
    { value: "LARGE", label: "Large", tag: "A+" },
    { value: "XLARGE", label: "XL", tag: "A++" },
  ];

  const themes: { value: AppTheme; label: string; sub: string; dot: string }[] = [
    { value: "DEFAULT", label: "Default Warm", sub: "Standard light emerald", dot: "bg-emerald-500" },
    { value: "DYSLEXIA", label: "Dyslexia Friendly", sub: "Warm cream & high readability", dot: "bg-amber-300 border border-amber-500" },
    { value: "ADHD", label: "ADHD Focus", sub: "Calm dark slate, low distraction", dot: "bg-slate-800 border border-slate-600" },
    { value: "SENSORY", label: "Sensory / Autism", sub: "Soft pastel sage green", dot: "bg-emerald-200 border border-emerald-400" },
    { value: "DARK_CONTRAST", label: "Low Vision Dark", sub: "Dark mode with yellow text", dot: "bg-amber-400 border border-black" },
  ];

  return (
    <>
      {/* Floating Handle Docked on Right Side */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open Accessibility Toolkit"
          title="Accessibility Toolkit"
          className="group flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 text-white pl-3.5 pr-2.5 py-3 rounded-l-2xl shadow-lg border-y border-l border-emerald-600 hover:-translate-x-1 transition-all cursor-pointer font-bold text-xs"
        >
          <Sliders className="w-5 h-5 text-emerald-100 group-hover:rotate-180 transition-transform duration-500 shrink-0" />
          <span className="hidden sm:inline tracking-wide font-sans">
            Toolkit
          </span>
        </button>
      </div>

      {/* Floating Panel (Right Side Drawer) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50"
            />

            {/* Right Drawer Panel */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-80 sm:w-88 bg-white border-l border-slate-200/90 shadow-2xl z-50 flex flex-col justify-between overflow-y-auto"
            >
              <div>
                {/* Header */}
                <div className="bg-[#FAF9F5] border-b border-slate-200/80 p-5 text-slate-900 flex items-center justify-between sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-base leading-tight text-slate-900 font-display">
                        Accessibility Controls
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Themes, font size & language
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shadow-xs"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-6">
                  {/* 1. Disability Theme Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-emerald-600" />
                      <span>Disability Color Themes</span>
                    </label>
                    <div className="space-y-1.5">
                      {themes.map((t) => {
                        const active = (prefs.appTheme || "DEFAULT") === t.value;
                        return (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => updatePrefs({ appTheme: t.value })}
                            className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              active
                                ? "bg-emerald-50 border-2 border-emerald-500 shadow-xs"
                                : "bg-[#FAF9F5] border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-3.5 h-3.5 rounded-full ${t.dot} shrink-0`} />
                              <div>
                                <p className={`text-xs font-bold ${active ? "text-emerald-900" : "text-slate-900"}`}>
                                  {t.label}
                                </p>
                                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{t.sub}</p>
                              </div>
                            </div>
                            {active && (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded-full shrink-0">
                                Active
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Font Size Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Type className="w-4 h-4 text-emerald-600" />
                      <span>Text Size</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2 bg-[#FAF9F5] p-2 rounded-2xl border border-slate-200/80">
                      {fontSizes.map((item) => {
                        const active = prefs.fontSize === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => updatePrefs({ fontSize: item.value })}
                            className={`py-2 rounded-xl text-xs transition-all cursor-pointer text-center ${
                              active
                                ? "bg-emerald-50 text-emerald-900 font-bold border-2 border-emerald-500 shadow-xs"
                                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <span className="block font-bold text-base">
                              {item.tag}
                            </span>
                            <span className="block text-[9px] mt-0.5 font-medium">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. High Contrast Mode Toggle */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Contrast className="w-4 h-4 text-emerald-600" />
                      <span>Display Mode</span>
                    </label>
                    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/90 bg-[#FAF9F5] hover:bg-white transition-all shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
                          <Contrast className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            High Contrast
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Bold text & high-contrast borders
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={prefs.highContrast}
                        onClick={() =>
                          updatePrefs({ highContrast: !prefs.highContrast })
                        }
                        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${
                          prefs.highContrast ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                            prefs.highContrast
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 4. Language Translation */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Languages className="w-4 h-4 text-emerald-600" />
                      <span>Language Translation</span>
                    </label>
                    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/90 bg-[#FAF9F5] hover:bg-white transition-all shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
                          <Languages className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            Language (भाषा)
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Switch EN / नेपाली
                          </p>
                        </div>
                      </div>
                      <LanguageToggle />
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 bg-[#FAF9F5] border-t border-slate-200/80 sticky bottom-0">
                <button
                  type="button"
                  onClick={resetPrefs}
                  className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset to Default</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingAccessibilityToolkit;
