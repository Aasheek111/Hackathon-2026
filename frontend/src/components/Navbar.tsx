import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight, LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import LanguageToggle from "./LanguageToggle";
import { homePathFor } from "../lib/homePath";

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "About", href: "/#about" },
    { name: "Features", href: "/#features" },
    { name: "Pricing", href: "/#pricing" },
    { name: "Contact", href: "/#contact" },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-xs py-2 border-b border-slate-200/80"
          : "bg-transparent py-1"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center group py-0.5 notranslate">
            <img
              src="/logo.png"
              alt="Pragya Logo"
              className="h-12 sm:h-14 md:h-20 w-auto object-contain transition-all duration-300 hover:scale-[1.02] notranslate"
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            <div className="flex space-x-6">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-slate-600 hover:text-slate-900 text-xs font-bold transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>
            <div className="flex items-center space-x-3">
              <LanguageToggle />
              {user ? (
                <>
                  <Link to={homePathFor(user)}>
                    <button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-2xl text-xs shadow-xs border-b-2 border-emerald-700 active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer">
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>Dashboard</span>
                    </button>
                  </Link>
                  <button
                    onClick={logout}
                    className="bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold px-3 py-2 rounded-2xl text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <button className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-2xl text-xs transition-colors">
                      Sign In
                    </button>
                  </Link>
                  <Link to="/register">
                    <button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-2xl text-xs shadow-xs border-b-2 border-emerald-700 active:translate-y-0.5 transition-all flex items-center gap-1.5">
                      <span>Get Started</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button + Language Toggle */}
          <div className="md:hidden flex items-center space-x-2">
            <LanguageToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-700 hover:text-slate-900 p-2"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-200 shadow-md mt-2"
          >
            <div className="px-6 py-6 space-y-4 flex flex-col">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-slate-700 hover:text-slate-900 py-1.5 text-base font-bold"
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-4 border-t border-slate-100 flex flex-col space-y-2.5">
                {user ? (
                  <>
                    <Link to={homePathFor(user)} onClick={() => setIsMobileMenuOpen(false)}>
                      <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-2xl shadow-sm border-b-4 border-emerald-700 text-sm flex items-center justify-center gap-2">
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </button>
                    </Link>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        logout();
                      }}
                      className="w-full bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-2xl text-sm">
                        Sign In
                      </button>
                    </Link>
                    <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                      <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-2xl shadow-sm border-b-4 border-emerald-700 text-sm">
                        Get Started
                      </button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
