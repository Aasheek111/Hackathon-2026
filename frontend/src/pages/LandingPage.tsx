import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Play,
  Brain,
  BookOpen,
  Headphones,
  Image as ImageIcon,
  Gamepad2,
  Eye,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Heart,
  ShieldCheck,
  Smile,
  ArrowRight,
  Star,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";

export const LandingPage: React.FC = () => {
  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  return (
    <div className="bg-[#FAF9F5] mt-24 text-slate-800 font-sans min-h-screen selection:bg-emerald-100 selection:text-emerald-900">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        {/* Soft Pastel Background Blobs */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute -top-10 left-10 w-80 h-80 bg-amber-100/60 rounded-full blur-3xl" />
          <div className="absolute top-20 right-10 w-96 h-96 bg-sky-100/70 rounded-full blur-3xl" />
          <div className="absolute top-40 left-1/3 w-72 h-72 bg-emerald-100/60 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-6 text-center">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="max-w-3xl mx-auto space-y-8"
          >
            {/* Friendly Badge */}
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 bg-white border border-slate-200/80 px-4 py-2 rounded-full shadow-sm"
            >
              <Smile className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-bold text-slate-700">
                Adaptive Education Platform
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.15]"
            >
              Learn the way <br className="hidden sm:block" />
              <span className="text-emerald-600 bg-emerald-100/70 px-4 py-1 rounded-3xl inline-block mt-2">
                your mind works best
              </span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={fadeUp}
              className="text-lg sm:text-xl text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto"
            >
              A calm, supportive platform that automatically adapts lessons
              between{" "}
              <strong className="text-slate-800 font-semibold">Text</strong>,{" "}
              <strong className="text-slate-800 font-semibold">Audio</strong>,{" "}
              <strong className="text-slate-800 font-semibold">Visual</strong>,
              and{" "}
              <strong className="text-slate-800 font-semibold">
                3D AR Games
              </strong>{" "}
              based on attention and comfort.
            </motion.p>

            {/* Touch-Friendly Big Buttons */}
            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Link to="/register" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all flex items-center justify-center gap-3">
                  <span>Start Free Adaptive Quiz</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
              <a href="#modes" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 font-bold text-lg px-8 py-4 rounded-2xl shadow-sm border border-slate-200 border-b-4 border-b-slate-300 active:translate-y-0.5 active:border-b-2 transition-all flex items-center justify-center gap-2">
                  <Play className="w-5 h-5 text-emerald-600 fill-emerald-600" />
                  <span>How Modes Work</span>
                </button>
              </a>
            </motion.div>

            {/* Trust Pills */}
            <motion.div
              variants={fadeUp}
              className="pt-6 flex flex-wrap justify-center gap-6 text-sm text-slate-500 font-medium"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Privacy-First Attention Sensing</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                <span>Zero Distractions or Pressure</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span>Self-Paced & Gentle</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Interactive 4 Learning Modes Banner */}
      <section id="modes" className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              4 Gentle Learning Modalities
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-3">
              One Concept. Four Adaptations.
            </h2>
            <p className="text-slate-600 mt-2 max-w-xl mx-auto text-base">
              When focus drifts, Pragya automatically pivots to keep learning
              comforting and engaging.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Mode 1: Text */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-[#FAF9F5] p-6 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mb-5 shadow-xs">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div className="text-xs font-bold text-amber-800 bg-amber-100/80 w-max px-2.5 py-0.5 rounded-full mb-2">
                  Default Mode
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Text Mode
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Clean, structured text with optimal typography designed for
                  reading clarity and steady concentration.
                </p>
              </div>
            </motion.div>

            {/* Mode 2: Audio */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-[#FAF9F5] p-6 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 bg-sky-100 text-sky-700 rounded-2xl flex items-center justify-center mb-5 shadow-xs">
                  <Headphones className="w-7 h-7" />
                </div>
                <div className="text-xs font-bold text-sky-800 bg-sky-100/80 w-max px-2.5 py-0.5 rounded-full mb-2">
                  Auditory Pivot
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Audio Mode
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Soothing text-to-speech narration and auditory prompts that
                  guide students gently without screen strain.
                </p>
              </div>
            </motion.div>

            {/* Mode 3: Visual */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-[#FAF9F5] p-6 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mb-5 shadow-xs">
                  <ImageIcon className="w-7 h-7" />
                </div>
                <div className="text-xs font-bold text-emerald-800 bg-emerald-100/80 w-max px-2.5 py-0.5 rounded-full mb-2">
                  Visual Pivot
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Visual Mode
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Rich, clear image-based concepts and diagrammatic
                  representations for visual-spatial thinkers.
                </p>
              </div>
            </motion.div>

            {/* Mode 4: AR Game */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-[#FAF9F5] p-6 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center mb-5 shadow-xs">
                  <Gamepad2 className="w-7 h-7" />
                </div>
                <div className="text-xs font-bold text-purple-800 bg-purple-100/80 w-max px-2.5 py-0.5 rounded-full mb-2">
                  Sensory Reward
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  AR 3D Game
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Interactive WebXR balloon-popping break game to refresh energy
                  and reinforce learning with joy.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">
                  <Heart className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Empathy-First Technology</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
                  Adaptive education built around the child, not the clock
                </h2>
                <div className="space-y-4 text-slate-600 text-base leading-relaxed">
                  <p>
                    Autistic students often experience sensory fatigue or focus
                    shifts when presented with rigid, uniform learning
                    materials.
                  </p>
                  <p>
                    Pragya uses gentle local computer vision to observe eye
                    contact and engagement. If a student grows disengaged from
                    text, the platform seamlessly switches to audio narration or
                    colorful visual cards.
                  </p>
                  <p>
                    This eliminates frustration before it starts, keeping
                    learning positive, self-paced, and encouraging.
                  </p>
                </div>
              </div>

              {/* Friendly Feature Card Stack */}
              <div className="bg-[#F4F7FB] p-8 rounded-3xl border border-slate-200/60 space-y-4">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-sm">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">
                  Why Families Love Pragya
                </h3>
                <ul className="space-y-4 pt-2">
                  {[
                    "91% improvement in sustained student engagement",
                    "Real-time affective mode adaptation without pop-ups",
                    "Private local processing — zero camera recordings stored",
                    "Custom analytics dashboard for teachers and parents",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                        ✓
                      </div>
                      <span className="text-slate-700 text-sm font-medium">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section
        id="features"
        className="py-20 bg-white border-t border-slate-100"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
              Thoughtful Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-3">
              Everything needed for a calm, joyful journey
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: BookOpen,
                color: "bg-amber-100 text-amber-800",
                title: "Readable Text Mode",
                desc: "Large typography, high-contrast spacing, and distraction-free layouts designed specifically for focus.",
              },
              {
                icon: Headphones,
                color: "bg-sky-100 text-sky-800",
                title: "Gentle Voice Narration",
                desc: "Calming audio narration guides auditory learners through questions and explanations effortlessly.",
              },
              {
                icon: ImageIcon,
                color: "bg-emerald-100 text-emerald-800",
                title: "Visual Concept Cards",
                desc: "Rich image-focused questions that replace heavy blocks of text with intuitive visual cues.",
              },
              {
                icon: Gamepad2,
                color: "bg-purple-100 text-purple-800",
                title: "Sensory AR Break Games",
                desc: "Fun 3D WebXR balloon games offer well-earned sensory breaks and positive reinforcement.",
              },
              {
                icon: Eye,
                color: "bg-rose-100 text-rose-800",
                title: "Privacy-First Sensing",
                desc: "On-device camera processing reads engagement signals locally. Video feeds are never saved or sent anywhere.",
              },
              {
                icon: BarChart3,
                color: "bg-teal-100 text-teal-800",
                title: "Parent & Teacher Insights",
                desc: "Clear, encouraging progress charts that highlight preferred learning modes and growth over time.",
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -4 }}
                className="bg-[#FAF9F5] p-8 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`w-12 h-12 ${f.color} rounded-2xl flex items-center justify-center mb-5 font-bold`}
                  >
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-28 bg-[#FAF9F5]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Simple & Fair Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-3">
              Accessible plans for every family & school
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Card 1 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  1 Month Pass
                </span>
                <div className="text-3xl sm:text-4xl font-bold text-slate-900 my-4">
                  NPR 499{" "}
                  <span className="text-sm font-normal text-slate-500">
                    /mo
                  </span>
                </div>
                <ul className="space-y-3 mb-8 text-sm text-slate-600 font-medium">
                  {[
                    "Full adaptive quiz access",
                    "All 4 learning modes",
                    "Standard parent analytics",
                    "Cancel anytime",
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/register">
                <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-6 rounded-2xl transition-all">
                  Get Started
                </button>
              </Link>
            </div>

            {/* Card 2 - Featured */}
            <div className="bg-white p-8 rounded-3xl border-2 border-emerald-500 shadow-lg relative flex flex-col justify-between transform md:-translate-y-2">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-sm">
                Most Popular
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  3 Month Pass
                </span>
                <div className="text-3xl sm:text-4xl font-bold text-slate-900 my-4">
                  NPR 1,299{" "}
                  <span className="text-sm font-normal text-slate-500">
                    /3 mos
                  </span>
                </div>
                <ul className="space-y-3 mb-8 text-sm text-slate-600 font-medium">
                  {[
                    "Everything in 1 Month Pass",
                    "Full AR 3D module games",
                    "Detailed progress breakdown",
                    "Priority support",
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/register">
                <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all">
                  Start 3-Month Plan
                </button>
              </Link>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  6 Month Pass
                </span>
                <div className="text-3xl sm:text-4xl font-bold text-slate-900 my-4">
                  NPR 2,299{" "}
                  <span className="text-sm font-normal text-slate-500">
                    /6 mos
                  </span>
                </div>
                <ul className="space-y-3 mb-8 text-sm text-slate-600 font-medium">
                  {[
                    "Everything in 3 Month Pass",
                    "Custom curriculum setup",
                    "Direct educator guidance",
                    "Save 23% overall",
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link to="/register">
                <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-6 rounded-2xl transition-all">
                  Get Started
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 mt-2 text-sm">
              Clear answers for parents and educators.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How does NeuroLearn adapt to the student?",
                a: "NeuroLearn uses gentle webcam engagement tracking to notice when eye contact or focus dips. It automatically shifts the lesson into text, audio narration, or visual cards to maintain comfort.",
              },
              {
                q: "Is webcam data recorded or stored?",
                a: "No. Video frames are analyzed locally in real time solely to calculate an attention metric. No video, images, or facial recordings are ever saved or transmitted.",
              },
              {
                q: "Can we manually choose or lock a learning mode?",
                a: "Yes! While automatic mode switching is active by default, parents or students can lock any specific mode at any time.",
              },
              {
                q: "What is the AR Learning Game?",
                a: "It's an interactive 3D WebXR balloon game that provides sensory breaks while reinforcing vocabulary and concept retention.",
              },
              {
                q: "How does payment work with eSewa?",
                a: "We support direct integration with Nepal's eSewa payment gateway for easy, instant subscription access.",
              },
            ].map((faq, i) => (
              <details
                key={i}
                className="bg-[#FAF9F5] rounded-2xl border border-slate-200/80 overflow-hidden group"
              >
                <summary className="p-5 cursor-pointer font-bold text-slate-800 flex justify-between items-center outline-none list-none">
                  <span>{faq.q}</span>
                  <ChevronDown className="w-5 h-5 text-slate-500 group-open:rotate-180 transition-transform shrink-0" />
                </summary>
                <div className="px-5 pb-5 text-slate-600 text-sm leading-relaxed border-t border-slate-200/40 pt-3">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-[#FAF9F5]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Get in Touch
                </span>
                <h2 className="text-3xl font-bold text-slate-900 mt-4 mb-3">
                  We are here to help
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Have questions about how Pragya works for your child or
                  school? Reach out to our team anytime.
                </p>
                <div className="space-y-3.5 text-sm text-slate-700 font-medium">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span>Kathmandu, Nepal</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span>contact@pragya.edu</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <span>+977 9800000000</span>
                  </div>
                </div>
              </div>

              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="text"
                  placeholder="Your Name"
                  className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
                />
                <input
                  type="email"
                  placeholder="Your Email"
                  className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
                />
                <textarea
                  placeholder="Message"
                  rows={4}
                  className="w-full bg-[#FAF9F5] border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm resize-none"
                />
                <button
                  type="button"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl shadow-md border-b-4 border-emerald-700 active:translate-y-0.5 active:border-b-2 transition-all text-sm"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Light Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Pragya Logo"
              className="h-20 sm:h-24 md:h-32 w-auto object-contain"
            />
            <span className="text-xs font-bold bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1 rounded-full ml-1">
              Adaptive Education
            </span>
          </div>
          <p>© 2026 Pragya. Empowering Every Mind.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
