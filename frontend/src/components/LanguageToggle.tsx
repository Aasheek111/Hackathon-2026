import React, { useState, useEffect } from "react";

const getCookie = (name: string): string => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return "";
};

const setGoogleTranslateCookie = (lang: "en" | "ne") => {
  const val = lang === "ne" ? "/en/ne" : "/en/en";
  const domain = window.location.hostname;

  // Clear existing cookies on both path=/ and path=/; domain=...
  document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  if (domain && domain !== "localhost") {
    document.cookie = `googtrans=; path=/; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `googtrans=; path=/; domain=.${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }

  // Set new cookie values
  document.cookie = `googtrans=${val}; path=/; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
  if (domain && domain !== "localhost") {
    document.cookie = `googtrans=${val}; path=/; domain=${domain}; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
    document.cookie = `googtrans=${val}; path=/; domain=.${domain}; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
  }
};

export const LanguageToggle: React.FC = () => {
  const [currentLang, setCurrentLang] = useState<"en" | "ne">("en");

  useEffect(() => {
    const cookieVal = getCookie("googtrans");
    if (cookieVal.includes("/ne") || cookieVal.includes("/en/ne")) {
      setCurrentLang("ne");
    } else {
      setCurrentLang("en");
    }
  }, []);

  const toggleLanguage = (targetLang: "en" | "ne") => {
    if (targetLang === currentLang) return;
    setGoogleTranslateCookie(targetLang);
    window.location.reload();
  };

  return (
    <div className="notranslate inline-flex items-center bg-slate-100 p-1 rounded-full border border-slate-200 shadow-xs">
      <button
        type="button"
        onClick={() => toggleLanguage("en")}
        className={`notranslate px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
          currentLang === "en"
            ? "bg-emerald-500 text-white shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
        aria-label="Switch to English"
      >
        <span className="notranslate">EN</span>
      </button>
      <button
        type="button"
        onClick={() => toggleLanguage("ne")}
        className={`notranslate px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
          currentLang === "ne"
            ? "bg-emerald-500 text-white shadow-xs"
            : "text-slate-600 hover:text-slate-900"
        }`}
        aria-label="नेपालीमा परिवर्तन गर्नुहोस्"
      >
        <span className="notranslate">ने</span>
      </button>
    </div>
  );
};

export default LanguageToggle;
