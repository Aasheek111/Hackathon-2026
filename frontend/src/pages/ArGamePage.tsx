import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gamepad2, Sparkles } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { homePathFor } from "../lib/homePath";

type GameId = "balloon" | "rocket" | "puzzle";

interface GameMeta {
  id: GameId;
  label: string;
  emoji: string;
  src: string;
  tagline: string;
  activeClass: string;
}

const GAMES: GameMeta[] = [
  {
    id: "balloon",
    label: "3D Balloon Popper",
    emoji: "",
    src: "/ar-game.html",
    tagline: "Pop the correct answer balloon in 3D space",
    activeClass: "bg-violet-600 text-white shadow-lg shadow-violet-600/40",
  },
  {
    id: "rocket",
    label: "Space Rocket Shooter",
    emoji: "",
    src: "/ar-game-3.html",
    tagline: "Aim with your mouse — click asteroids to fire!",
    activeClass: "bg-sky-600 text-white shadow-lg shadow-sky-600/40",
  },
  {
    id: "puzzle",
    label: "Memory Match Puzzle",
    emoji: "",
    src: "/ar-game-4.html",
    tagline: "Flip cards to match every question with its answer",
    activeClass: "bg-indigo-600 text-white shadow-lg shadow-indigo-600/40",
  },
];

export const ArGamePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeGameId, setActiveGameId] = useState<GameId>("balloon");

  const activeGame = GAMES.find((g) => g.id === activeGameId)!;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen w-screen bg-[#0a0a0f] flex flex-col overflow-hidden text-white"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Header Bar ──────────────────────────────────────── */}
      <header
        className="shrink-0 flex items-center justify-between px-5 py-3 z-20 border-b"
        style={{
          background: "rgba(10,10,20,0.92)",
          backdropFilter: "blur(16px)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        {/* Left: Back + Title */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(homePathFor(user))}
            className="flex items-center text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Dashboard
          </button>
          <div className="hidden sm:flex items-center space-x-2 text-sm font-bold">
            <Gamepad2 className="w-5 h-5 text-violet-400" />
            <span className="text-white">AR Games Hub</span>
          </div>
        </div>

        {/* Center: Game Tab Switcher */}
        <div
          className="flex items-center space-x-1 p-1 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {GAMES.map((g) => (
            <button
              key={g.id}
              onClick={() => setActiveGameId(g.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeGameId === g.id
                  ? g.activeClass
                  : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
            >
              <span>{g.emoji}</span>
              <span className="hidden md:inline">{g.label}</span>
            </button>
          ))}
        </div>

        {/* Right: Status badge */}
        <div className="hidden md:flex items-center space-x-2 text-xs">
          <span
            className="flex items-center px-3 py-1 rounded-full font-bold"
            style={{
              background: "rgba(139,92,246,0.2)",
              border: "1px solid rgba(139,92,246,0.35)",
              color: "#c4b5fd",
            }}
          >
            3D WebXR Active
          </span>
        </div>
      </header>

      {/* ── Active Game Info Bar ─────────────────────────────── */}
      <div
        className="shrink-0 px-5 py-2 flex items-center justify-center text-xs font-medium border-b"
        style={{
          background: "rgba(255,255,255,0.02)",
          borderColor: "rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        <span>{activeGame.emoji}</span>&nbsp;
        <span className="font-bold text-white">{activeGame.label}</span>
        &nbsp;—&nbsp;
        <span>{activeGame.tagline}</span>
      </div>

      {/* ── Game Iframe ──────────────────────────────────────── */}
      {/* key={activeGameId} remounts the iframe fresh on every tab switch so
          A-Frame / canvas games always render into a visible, sized element */}
      <div className="flex-1 relative w-full">
        <iframe
          key={activeGameId}
          src={activeGame.src}
          title={activeGame.label}
          className="absolute inset-0 w-full h-full border-none"
          allow="camera; microphone; accelerometer; magnetometer; gyroscope; autoplay"
        />
      </div>
    </motion.div>
  );
};

export default ArGamePage;
