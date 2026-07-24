import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  LogOut,
  Volume2,
  Image as ImageIcon,
  BookOpen,
  Camera,
  Eye,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { homePathFor } from "../lib/homePath";

type LearningMode = "TEXT" | "AUDIO" | "VISUAL";

type EngagementTotals = Record<
  LearningMode,
  { totalScore: number; samples: number; focusedSamples: number }
>;

type CvEngagementResponse = {
  engagement_score: number;
  face_detected: boolean;
  gaze: "forward" | "left" | "right" | "up" | "down" | "away";
  blink_detected: boolean;
  head_pose: { pitch: number; yaw: number; roll: number };
};

const CV_SERVICE_URL =
  import.meta.env.VITE_CV_SERVICE_URL || "http://localhost:8000";
const TRACKING_INTERVAL_MS = 250;
const LOW_EYE_CONTACT_THRESHOLD = 40;
const LOW_EYE_CONTACT_SAMPLES = 8;
// How long the "Adapting Learning Mode…" screen stays up before the next
// question replaces it. Long enough to actually read what changed and why -
// at under a second it read as a flicker and the question just jumped.
const MODE_TRANSITION_MS = 3500;
// How long the correct/incorrect feedback stays on screen after answering
// before advancing. Learners need time to register the result, especially
// when the answer was wrong.
const ANSWER_FEEDBACK_MS = 3000;

// Fixed adaptation cycle: when focus is lost, we move to the *next* mode in
// this sequence (looping back to the start), regardless of subject. The
// question itself doesn't change subject - only how it's presented changes.
const MODE_CYCLE: LearningMode[] = ["TEXT", "AUDIO", "VISUAL"];

const MODE_LABELS: Record<LearningMode, string> = {
  TEXT: "Text",
  AUDIO: "Audio",
  VISUAL: "Visual",
};

const DEFAULT_SUBJECT_IMAGES: Record<string, string> = {
  MATH: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80",
  SCIENCE: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80",
  ASTRONOMY: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=800&q=80",
  NATURE: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80",
  ANIMALS: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=800&q=80",
  SOUNDS: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
  GEOMETRY: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
  GEOGRAPHY: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
  BOTANY: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=800&q=80",
  BIOLOGY: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=800&q=80",
  ANATOMY: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=800&q=80",
};

const getSubjectDatasetImage = (subject: string): string => {
  const upper = (subject || "").toUpperCase();
  return (
    DEFAULT_SUBJECT_IMAGES[upper] ||
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80"
  );
};

const demo20Questions = [
  {
    id: "1",
    question: "What is 5 + 3?",
    options: ["6", "7", "8", "9"],
    answer: "8",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "2",
    question: "Which animal is known as the King of the Jungle?",
    options: ["Tiger", "Elephant", "Lion", "Bear"],
    answer: "Lion",
    learningMode: "VISUAL",
    subject: "Animals",
    imageUrl: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "3",
    question: "What color is the clear sky during daytime?",
    options: ["Red", "Blue", "Green", "Yellow"],
    answer: "Blue",
    learningMode: "AUDIO",
    subject: "Nature",
    imageUrl: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "4",
    question: "What is 12 - 4?",
    options: ["6", "7", "8", "9"],
    answer: "8",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "5",
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    answer: "Mars",
    learningMode: "VISUAL",
    subject: "Astronomy",
    imageUrl: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "6",
    question: "How many legs does a spider have?",
    options: ["6", "8", "10", "4"],
    answer: "8",
    learningMode: "AUDIO",
    subject: "Nature",
    imageUrl: "https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "7",
    question: "What is 4 x 3?",
    options: ["10", "12", "14", "16"],
    answer: "12",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "8",
    question: "Which of these is a mammal that can fly?",
    options: ["Eagle", "Bat", "Pigeon", "Butterfly"],
    answer: "Bat",
    learningMode: "VISUAL",
    subject: "Animals",
    imageUrl: "https://images.unsplash.com/photo-1590005354167-6da97870c757?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "9",
    question: "What sound does a dog make?",
    options: ["Meow", "Woof", "Moo", "Quack"],
    answer: "Woof",
    learningMode: "AUDIO",
    subject: "Animals",
    imageUrl: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "10",
    question: "How many sides does a hexagon have?",
    options: ["5", "6", "7", "8"],
    answer: "6",
    learningMode: "TEXT",
    subject: "Geometry",
    imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "11",
    question: "Which ocean is the largest on Earth?",
    options: ["Atlantic", "Indian", "Pacific", "Arctic"],
    answer: "Pacific",
    learningMode: "VISUAL",
    subject: "Geography",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "12",
    question: "What is 9 + 6?",
    options: ["13", "14", "15", "16"],
    answer: "15",
    learningMode: "AUDIO",
    subject: "Math",
    imageUrl: "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "13",
    question: "What is the freezing point of water in Celsius?",
    options: ["0°C", "10°C", "32°C", "100°C"],
    answer: "0°C",
    learningMode: "TEXT",
    subject: "Science",
    imageUrl: "https://images.unsplash.com/photo-1517685352821-92cf88aee5a5?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "14",
    question: "Which fruit is famous for having seeds on the outside?",
    options: ["Apple", "Banana", "Strawberry", "Grape"],
    answer: "Strawberry",
    learningMode: "VISUAL",
    subject: "Botany",
    imageUrl: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "15",
    question: "Which gas do humans need to breathe to live?",
    options: ["Carbon Dioxide", "Oxygen", "Nitrogen", "Helium"],
    answer: "Oxygen",
    learningMode: "AUDIO",
    subject: "Biology",
    imageUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "16",
    question: "What is 15 ÷ 3?",
    options: ["3", "4", "5", "6"],
    answer: "5",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "17",
    question: "Which organ pumps blood throughout the human body?",
    options: ["Brain", "Lungs", "Heart", "Stomach"],
    answer: "Heart",
    learningMode: "VISUAL",
    subject: "Anatomy",
    imageUrl: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "18",
    question: "How many days are in a leap year?",
    options: ["364", "365", "366", "367"],
    answer: "366",
    learningMode: "AUDIO",
    subject: "General Knowledge",
    imageUrl: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "19",
    question: "Which primary colors mix together to make Green?",
    options: ["Red & Blue", "Blue & Yellow", "Red & Yellow", "Purple & White"],
    answer: "Blue & Yellow",
    learningMode: "TEXT",
    subject: "Art",
    imageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "20",
    question: "What is 20 - 7?",
    options: ["11", "12", "13", "14"],
    answer: "13",
    learningMode: "VISUAL",
    subject: "Math",
    imageUrl: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "21",
    question: "What is the tallest mountain peak in the world?",
    options: ["K2", "Mount Everest", "Kanchanjunga", "Lhotse"],
    answer: "Mount Everest",
    learningMode: "VISUAL",
    subject: "Geography",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "22",
    question: "What process do plants use to make food using sunlight?",
    options: ["Respiration", "Photosynthesis", "Evaporation", "Digestion"],
    answer: "Photosynthesis",
    learningMode: "TEXT",
    subject: "Botany",
    imageUrl: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "23",
    question: "What is the main source of energy for planet Earth?",
    options: ["The Moon", "The Sun", "Volcanoes", "Wind"],
    answer: "The Sun",
    learningMode: "VISUAL",
    subject: "Astronomy",
    imageUrl: "https://images.unsplash.com/photo-1538370965046-79c0d6907d47?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "24",
    question: "What is 7 x 7?",
    options: ["42", "47", "49", "54"],
    answer: "49",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "25",
    question: "Which organ in the human body is responsible for thinking and memory?",
    options: ["Heart", "Lungs", "Brain", "Liver"],
    answer: "Brain",
    learningMode: "VISUAL",
    subject: "Anatomy",
    imageUrl: "https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "26",
    question: "What is the capital city of Nepal?",
    options: ["Pokhara", "Kathmandu", "Lalitpur", "Biratnagar"],
    answer: "Kathmandu",
    learningMode: "TEXT",
    subject: "Geography",
    imageUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "27",
    question: "Which planet is famous for its large ring system?",
    options: ["Jupiter", "Saturn", "Uranus", "Neptune"],
    answer: "Saturn",
    learningMode: "VISUAL",
    subject: "Astronomy",
    imageUrl: "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "28",
    question: "How many sides does a triangle have?",
    options: ["2", "3", "4", "5"],
    answer: "3",
    learningMode: "TEXT",
    subject: "Geometry",
    imageUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "29",
    question: "What is the hardest natural substance found on Earth?",
    options: ["Gold", "Iron", "Diamond", "Quartz"],
    answer: "Diamond",
    learningMode: "VISUAL",
    subject: "Science",
    imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "30",
    question: "What force keeps our feet on the ground and pulls objects downward?",
    options: ["Magnetism", "Friction", "Gravity", "Electricity"],
    answer: "Gravity",
    learningMode: "AUDIO",
    subject: "Physics",
    imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "31",
    question: "What is 8 x 6?",
    options: ["42", "46", "48", "52"],
    answer: "48",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "32",
    question: "Which nocturnal bird can rotate its head almost 270 degrees?",
    options: ["Owl", "Falcon", "Parrot", "Peacock"],
    answer: "Owl",
    learningMode: "VISUAL",
    subject: "Animals",
    imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "33",
    question: "How many bones are in the adult human body?",
    options: ["186", "206", "226", "246"],
    answer: "206",
    learningMode: "TEXT",
    subject: "Anatomy",
    imageUrl: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "34",
    question: "What is the boiling point of pure water in Celsius?",
    options: ["80°C", "90°C", "100°C", "120°C"],
    answer: "100°C",
    learningMode: "VISUAL",
    subject: "Science",
    imageUrl: "https://images.unsplash.com/photo-1517685352821-92cf88aee5a5?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "35",
    question: "Which galaxy contains our Solar System?",
    options: ["Andromeda", "Milky Way", "Sombrero", "Whirlpool"],
    answer: "Milky Way",
    learningMode: "VISUAL",
    subject: "Astronomy",
    imageUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "36",
    question: "What is 100 - 45?",
    options: ["45", "50", "55", "65"],
    answer: "55",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "37",
    question: "Which gas do green plants absorb from the atmosphere for photosynthesis?",
    options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"],
    answer: "Carbon Dioxide",
    learningMode: "VISUAL",
    subject: "Botany",
    imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "38",
    question: "Which animal is the largest living mammal on Earth?",
    options: ["African Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
    answer: "Blue Whale",
    learningMode: "VISUAL",
    subject: "Animals",
    imageUrl: "https://images.unsplash.com/photo-1568430460464-02e706195981?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "39",
    question: "What is 18 ÷ 2?",
    options: ["7", "8", "9", "10"],
    answer: "9",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "40",
    question: "Which ancient civilization built the Great Pyramids of Giza?",
    options: ["Romans", "Greeks", "Egyptians", "Mayans"],
    answer: "Egyptians",
    learningMode: "VISUAL",
    subject: "History",
    imageUrl: "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "41",
    question: "What is 3 squared (3²)?",
    options: ["6", "7", "8", "9"],
    answer: "9",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "42",
    question: "Which country has the largest total land area in the world?",
    options: ["Canada", "China", "United States", "Russia"],
    answer: "Russia",
    learningMode: "VISUAL",
    subject: "Geography",
    imageUrl: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "43",
    question: "What is the primary organ in humans used for breathing?",
    options: ["Heart", "Lungs", "Liver", "Kidneys"],
    answer: "Lungs",
    learningMode: "VISUAL",
    subject: "Anatomy",
    imageUrl: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "44",
    question: "What is 50% of 80?",
    options: ["30", "40", "50", "60"],
    answer: "40",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "45",
    question: "Which natural satellite orbits planet Earth?",
    options: ["Phobos", "Europa", "The Moon", "Titan"],
    answer: "The Moon",
    learningMode: "VISUAL",
    subject: "Astronomy",
    imageUrl: "https://images.unsplash.com/photo-1532693322450-2cb5c511067d?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "46",
    question: "What is the chemical formula for water?",
    options: ["CO2", "H2O", "NaCl", "O2"],
    answer: "H2O",
    learningMode: "TEXT",
    subject: "Science",
    imageUrl: "https://images.unsplash.com/photo-1517685352821-92cf88aee5a5?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "47",
    question: "How many sides does an octagon have?",
    options: ["6", "7", "8", "10"],
    answer: "8",
    learningMode: "VISUAL",
    subject: "Geometry",
    imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "48",
    question: "What is 11 x 11?",
    options: ["111", "121", "131", "141"],
    answer: "121",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "49",
    question: "Which desert is the largest hot desert in the world?",
    options: ["Gobi", "Kalahari", "Sahara", "Atacama"],
    answer: "Sahara",
    learningMode: "VISUAL",
    subject: "Geography",
    imageUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "50",
    question: "What is 64 ÷ 8?",
    options: ["6", "7", "8", "9"],
    answer: "8",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "51",
    question: "Which organ system protects the body and includes our skin?",
    options: ["Integumentary", "Circulatory", "Nervous", "Skeletal"],
    answer: "Integumentary",
    learningMode: "VISUAL",
    subject: "Anatomy",
    imageUrl: "https://images.unsplash.com/photo-1512290900673-45a8df2f3e8f?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "52",
    question: "What is 14 + 19?",
    options: ["31", "32", "33", "34"],
    answer: "33",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "53",
    question: "Which continent is Mount Everest located in?",
    options: ["Europe", "Africa", "Asia", "South America"],
    answer: "Asia",
    learningMode: "VISUAL",
    subject: "Geography",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "54",
    question: "How many planets are in our solar system?",
    options: ["7", "8", "9", "10"],
    answer: "8",
    learningMode: "TEXT",
    subject: "Astronomy",
    imageUrl: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "55",
    question: "What state of matter is steam?",
    options: ["Solid", "Liquid", "Gas", "Plasma"],
    answer: "Gas",
    learningMode: "VISUAL",
    subject: "Science",
    imageUrl: "https://images.unsplash.com/photo-1517685352821-92cf88aee5a5?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "56",
    question: "What is 9 x 9?",
    options: ["72", "79", "81", "90"],
    answer: "81",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "57",
    question: "Which fast cat species is famous for being the fastest land animal?",
    options: ["Lion", "Cheetah", "Leopard", "Jaguar"],
    answer: "Cheetah",
    learningMode: "VISUAL",
    subject: "Animals",
    imageUrl: "https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "58",
    question: "What is 144 ÷ 12?",
    options: ["10", "11", "12", "13"],
    answer: "12",
    learningMode: "TEXT",
    subject: "Math",
    imageUrl: "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "59",
    question: "Which organ filters waste from the blood to produce urine?",
    options: ["Liver", "Kidneys", "Pancreas", "Spleen"],
    answer: "Kidneys",
    learningMode: "VISUAL",
    subject: "Anatomy",
    imageUrl: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "60",
    question: "What is the longest river in the world?",
    options: ["Amazon", "Nile", "Mississippi", "Yangtze"],
    answer: "Nile",
    learningMode: "VISUAL",
    subject: "Geography",
    imageUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80",
  },
];

const getRandom20Questions = () => {
  const shuffled = [...demo20Questions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 20);
};

export const QuizPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState(() => getRandom20Questions());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMode, setCurrentMode] = useState<LearningMode>("TEXT");
  const [timeLeft, setTimeLeft] = useState(900);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showTransition, setShowTransition] = useState(false);
  const [score, setScore] = useState(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [gazeStatus, setGazeStatus] = useState<string>("Detecting... 👁️");
  const [engagementScore, setEngagementScore] = useState<number>(0);
  const [adaptationToast, setAdaptationToast] = useState<string | null>(null);

  const [modeEngagement, setModeEngagement] = useState<EngagementTotals>({
    TEXT: { totalScore: 0, samples: 0, focusedSamples: 0 },
    AUDIO: { totalScore: 0, samples: 0, focusedSamples: 0 },
    VISUAL: { totalScore: 0, samples: 0, focusedSamples: 0 },
  });

  // Fetch admin-uploaded questions from database
  useEffect(() => {
    api
      .get("/assessments/questions")
      .then(({ data }) => {
        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          const adminFormatted = data.questions.map((q: any) => ({
            id: q.id,
            question: q.question,
            options: Array.isArray(q.options)
              ? q.options
              : typeof q.options === "string"
              ? JSON.parse(q.options)
              : [],
            answer: q.answer,
            learningMode: q.learningMode || "TEXT",
            subject: q.subject || "General",
            imageUrl:
              q.imageUrl ||
              "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
          }));

          // Admin questions come first, merged with demo pool
          const combined = [...adminFormatted, ...demo20Questions];
          const deduplicated = Array.from(
            new Map(combined.map((item) => [item.question, item])).values()
          );
          const merged = deduplicated.slice(0, Math.max(20, adminFormatted.length));
          setQuestions(merged);
          // Set initial mode from the first question's learningMode
          if (merged[0]?.learningMode) {
            const firstMode = merged[0].learningMode as LearningMode;
            setCurrentMode(firstMode);
            currentModeRef.current = firstMode;
          }
        }
      })
      .catch(() => {
        /* Local fallback holds */
      });
  }, []);

  const lowEyeContactCounter = useRef(0);
  const adaptationLockedRef = useRef(false);
  const currentIndexRef = useRef(0);
  const currentModeRef = useRef<LearningMode>("TEXT");
  const modeEngagementRef = useRef<EngagementTotals>(modeEngagement);
  const scoreSmoothingRef = useRef(0);
  const visitedQuestionIdsRef = useRef(new Set([demo20Questions[0].id]));
  const sessionIdRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `quiz-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const synth = window.speechSynthesis;

  const attemptIdRef = useRef<string | null>(null);
  const adaptationCountRef = useRef(0);
  const completedRef = useRef(false);
  const startedAtMsRef = useRef(Date.now());
  const engagementSyncCounterRef = useRef(0);

  useEffect(() => {
    api
      .post("/assessments/start")
      .then(({ data }) => {
        attemptIdRef.current = data.attemptId;
      })
      .catch(() => undefined);
  }, []);

  const completeAssessment = useCallback(
    (finalScore: number, finalTotal: number): Promise<any | null> => {
      if (completedRef.current || !attemptIdRef.current)
        return Promise.resolve(null);
      completedRef.current = true;
      const durationSeconds = Math.round(
        (Date.now() - startedAtMsRef.current) / 1000,
      );
      return api
        .post(`/assessments/${attemptIdRef.current}/complete`, {
          modeEngagement: modeEngagementRef.current,
          adaptationCount: adaptationCountRef.current,
          scoreCorrect: finalScore,
          scoreTotal: finalTotal,
          durationSeconds,
        })
        .then(({ data }) => data.attempt)
        .catch(() => null);
    },
    [],
  );

  useEffect(() => {
    currentIndexRef.current = currentIndex;
    if (questions[currentIndex]) {
      visitedQuestionIdsRef.current.add(questions[currentIndex].id);
    }
  }, [currentIndex, questions]);

  useEffect(() => {
    currentModeRef.current = currentMode;
  }, [currentMode]);

  useEffect(() => {
    modeEngagementRef.current = modeEngagement;
  }, [modeEngagement]);

  const getGazeLabel = (result: CvEngagementResponse) => {
    if (!result.face_detected) return "No Face Detected";
    if (result.gaze === "forward") return "Focused";
    if (result.gaze === "left" || result.gaze === "right") return "Side Glance";
    if (result.gaze === "up") return "Looking Up";
    if (result.gaze === "down") return "Looking Down";
    return "Looking Away";
  };

  const drawTrackingOverlay = (isFaceInFrame: boolean, gaze: string) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !video || !ctx) return;

    const width = video.videoWidth || 320;
    const height = video.videoHeight || 240;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    const boxWidth = width * 0.44;
    const boxHeight = height * 0.42;
    const boxX = (width - boxWidth) / 2;
    const boxY = height * 0.22;
    ctx.strokeStyle = isFaceInFrame ? "#10B981" : "#F43F5E";
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    if (isFaceInFrame) {
      ctx.fillStyle = gaze === "forward" ? "#F59E0B" : "#F97316";
      ctx.beginPath();
      ctx.arc(width * 0.42, height * 0.42, 5, 0, Math.PI * 2);
      ctx.arc(width * 0.58, height * 0.42, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const captureFrame = () =>
    new Promise<string | null>((resolve) => {
      const video = videoRef.current;
      if (
        !video ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        video.videoWidth === 0
      ) {
        resolve(null);
        return;
      }
      const canvas =
        analysisCanvasRef.current ?? document.createElement("canvas");
      analysisCanvasRef.current = canvas;
      canvas.width = 320;
      canvas.height =
        Math.round((video.videoHeight / video.videoWidth) * canvas.width) ||
        240;
      const ctx = canvas.getContext("2d", { willReadFrequently: false });
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () =>
            resolve(typeof reader.result === "string" ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.62,
      );
    });

  // Instead of scoring which mode has performed "best" and jumping to a
  // matching subject, we simply advance to the next mode in the fixed
  // cycle: Text -> Audio -> Visual -> AR Game -> Text -> ...
  const getNextModeInCycle = useCallback(
    (current: LearningMode): LearningMode => {
      const idx = MODE_CYCLE.indexOf(current);
      return MODE_CYCLE[(idx + 1) % MODE_CYCLE.length];
    },
    [],
  );

  // Finds the next unvisited question in sequence, regardless of its
  // subject or the learningMode it was originally tagged with - the
  // question order/subject progression is preserved, only the *mode* used
  // to present it changes.
  const findNextQuestionIndex = useCallback(() => {
    const visited = visitedQuestionIdsRef.current;
    const start = currentIndexRef.current + 1;
    const nextInOrder = questions.findIndex(
      (question, index) => index >= start && !visited.has(question.id),
    );
    if (nextInOrder !== -1) return nextInOrder;
    const anyFresh = questions.findIndex(
      (question) => !visited.has(question.id),
    );
    return anyFresh !== -1 ? anyFresh : null;
  }, [questions]);

  const handleEyeContactLossAdaptation = useCallback(() => {
    if (adaptationLockedRef.current || selectedAnswer !== null) return;
    adaptationLockedRef.current = true;
    const nextMode = getNextModeInCycle(currentModeRef.current);
    const nextIndex = findNextQuestionIndex();
    if (nextIndex === null) {
      completeAssessment(score, visitedQuestionIdsRef.current.size).then(
        (attempt) => {
          navigate("/quiz/result", {
            state: {
              score,
              total: visitedQuestionIdsRef.current.size,
              attempt,
            },
          });
        },
      );
      return;
    }
    setAdaptationToast(
      `Attention shift detected! Switching to ${MODE_LABELS[nextMode]} mode.`,
    );
    setTimeout(() => setAdaptationToast(null), 4000);
    setShowTransition(true);
    synth.cancel();
    window.setTimeout(() => {
      adaptationCountRef.current += 1;
      setCurrentMode(nextMode);
      setCurrentIndex(nextIndex);
      currentIndexRef.current = nextIndex;
      currentModeRef.current = nextMode;
      setSelectedAnswer(null);
      setIsCorrect(null);
      setShowTransition(false);
      lowEyeContactCounter.current = 0;
      window.setTimeout(() => {
        adaptationLockedRef.current = false;
      }, 1800);
    }, MODE_TRANSITION_MS);
  }, [
    completeAssessment,
    findNextQuestionIndex,
    getNextModeInCycle,
    navigate,
    score,
    selectedAnswer,
    synth,
  ]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, max: 640 },
            height: { ideal: 480, max: 480 },
            frameRate: { ideal: 24, max: 30 },
            facingMode: "user",
          },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
          setCameraActive(true);
          setCameraError(null);
        }
      } catch (err) {
        console.warn("Webcam permission not granted or camera in use", err);
        setCameraError("Camera access requested for real eye tracking");
        setCameraActive(false);
      }
    }
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    let lastSampleTime = 0;
    let requestInFlight = false;
    let cancelled = false;
    const processEyeTracking = async (now: number) => {
      if (now - lastSampleTime > TRACKING_INTERVAL_MS && !requestInFlight) {
        lastSampleTime = now;
        requestInFlight = true;
        try {
          if (videoRef.current && canvasRef.current && cameraActive) {
            const frame = await captureFrame();
            if (!frame || cancelled) {
              requestInFlight = false;
              animationFrameId = requestAnimationFrame(processEyeTracking);
              return;
            }
            const response = await fetch(`${CV_SERVICE_URL}/analyze-frame`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ frame, session_id: sessionIdRef.current }),
            });
            if (!response.ok)
              throw new Error(`CV service returned ${response.status}`);
            const result = (await response.json()) as CvEngagementResponse;
            if (cancelled) return;
            const isFaceInFrame = result.face_detected;
            const rawScore = isFaceInFrame
              ? Math.max(0, Math.min(100, result.engagement_score))
              : 0;
            scoreSmoothingRef.current = isFaceInFrame
              ? Math.round(scoreSmoothingRef.current * 0.55 + rawScore * 0.45)
              : 0;
            const calculatedScore = scoreSmoothingRef.current;
            const isFocused =
              isFaceInFrame &&
              result.gaze === "forward" &&
              calculatedScore >= 60;
            const mode = currentModeRef.current;
            setFaceDetected(isFaceInFrame);
            setEngagementScore(calculatedScore);
            setGazeStatus(getGazeLabel(result));
            setCameraError(null);
            setModeEngagement((prev) => {
              if (!isFaceInFrame) return prev;
              const updated = {
                ...prev,
                [mode]: {
                  totalScore: prev[mode].totalScore + calculatedScore,
                  samples: prev[mode].samples + 1,
                  focusedSamples:
                    prev[mode].focusedSamples + (isFocused ? 1 : 0),
                },
              };
              modeEngagementRef.current = updated;
              return updated;
            });
            engagementSyncCounterRef.current += 1;
            if (
              attemptIdRef.current &&
              engagementSyncCounterRef.current % 8 === 0
            ) {
              api
                .post(`/assessments/${attemptIdRef.current}/engagement`, {
                  score: calculatedScore,
                  faceDetected: isFaceInFrame,
                  gaze: result.gaze,
                  mode,
                })
                .catch(() => undefined);
            }
            if (
              !isFaceInFrame ||
              calculatedScore < LOW_EYE_CONTACT_THRESHOLD ||
              result.gaze === "away"
            ) {
              lowEyeContactCounter.current += 1;
              if (lowEyeContactCounter.current >= LOW_EYE_CONTACT_SAMPLES) {
                handleEyeContactLossAdaptation();
              }
            } else {
              lowEyeContactCounter.current = 0;
            }
            drawTrackingOverlay(isFaceInFrame, result.gaze);
          }
        } catch (err) {
          if (!cancelled) {
            console.warn("CV eye tracking unavailable", err);
            setCameraError("Start CV service on port 8000 for eye tracking");
            setFaceDetected(false);
            setEngagementScore(0);
            setGazeStatus("CV Service Offline");
            lowEyeContactCounter.current = 0;
            drawTrackingOverlay(false, "away");
          }
        } finally {
          requestInFlight = false;
        }
      }
      if (!cancelled)
        animationFrameId = requestAnimationFrame(processEyeTracking);
    };
    animationFrameId = requestAnimationFrame(processEyeTracking);
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrameId);
    };
  }, [cameraActive, handleEyeContactLossAdaptation]);

  useEffect(() => {
    if (timeLeft <= 0) {
      completeAssessment(score, visitedQuestionIdsRef.current.size).then(
        (attempt) => {
          navigate("/quiz/result", {
            state: {
              score,
              total: visitedQuestionIdsRef.current.size,
              attempt,
            },
          });
        },
      );
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, navigate, score, completeAssessment]);

  useEffect(() => {
    if (currentMode === "AUDIO" && questions[currentIndex]) {
      speakText(questions[currentIndex].question);
    }
    return () => synth.cancel();
  }, [currentIndex, currentMode, questions]);

  const speakText = (text: string) => {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const friendlyVoice = voices.find(
      (v) =>
        v.name.includes("Google") ||
        v.name.includes("Samantha") ||
        v.lang.includes("en"),
    );
    if (friendlyVoice) utterance.voice = friendlyVoice;
    utterance.rate = 0.9;
    synth.speak(utterance);
  };

  const handleAnswer = (option: string) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(option);
    const correct = option === questions[currentIndex].answer;
    setIsCorrect(correct);
    if (correct) setScore((prev) => prev + 1);
    if (attemptIdRef.current) {
      api
        .post(`/assessments/${attemptIdRef.current}/answer`, {
          questionId: questions[currentIndex].id,
          answer: option,
          correct,
          mode: currentModeRef.current,
        })
        .catch(() => undefined);
    }
    setTimeout(() => {
      const nextIndex = findNextQuestionIndex();
      if (nextIndex !== null) {
        // Respect admin-set learningMode for the next question as the baseline
        const nextQ = questions[nextIndex];
        if (nextQ?.learningMode && !adaptationLockedRef.current) {
          const nextQMode = nextQ.learningMode as LearningMode;
          setCurrentMode(nextQMode);
          currentModeRef.current = nextQMode;
        }
        setCurrentIndex(nextIndex);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        const finalScore = score + (correct ? 1 : 0);
        completeAssessment(finalScore, visitedQuestionIdsRef.current.size).then(
          (attempt) => {
            navigate("/quiz/result", {
              state: {
                score: finalScore,
                total: visitedQuestionIdsRef.current.size,
                attempt,
              },
            });
          },
        );
      }
    }, ANSWER_FEEDBACK_MS);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const currentQ = questions[currentIndex];
  if (!currentQ) return null;

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900 flex flex-col relative overflow-hidden">
      <AnimatePresence>
        {adaptationToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-100 border border-amber-300 text-amber-900 font-bold px-6 py-3 rounded-2xl shadow-md flex items-center space-x-2 text-sm"
          >
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{adaptationToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-30 border-b border-slate-200 shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 font-bold text-lg">
            <Clock className="w-5 h-5 text-amber-500" />
            <span
              className={
                timeLeft < 60 ? "text-rose-600 animate-pulse" : "text-slate-900"
              }
            >
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="hidden sm:flex items-center space-x-2 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold">
            {currentMode === "TEXT" && (
              <>
                <BookOpen className="w-4 h-4 text-amber-600" />{" "}
                <span>Text Mode</span>
              </>
            )}
            {currentMode === "AUDIO" && (
              <>
                <Volume2 className="w-4 h-4 text-sky-600" />{" "}
                <span>Audio Mode</span>
              </>
            )}
            {currentMode === "VISUAL" && (
              <>
                <ImageIcon className="w-4 h-4 text-emerald-600" />{" "}
                <span>Visual Mode</span>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{
                width: `${((currentIndex + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
          <div className="text-center text-xs text-slate-500 font-bold mt-1">
            Question {currentIndex + 1} of {questions.length} • Score: {score}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              completeAssessment(
                score,
                visitedQuestionIdsRef.current.size,
              ).then((attempt) => {
                navigate("/quiz/result", {
                  state: {
                    score,
                    total: visitedQuestionIdsRef.current.size,
                    attempt,
                  },
                });
              });
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3.5 py-2 rounded-2xl transition-all"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="hidden sm:inline">Finish Quiz</span>
          </button>
          <button
            onClick={() => navigate(homePathFor(user))}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-2xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row items-center justify-center p-4 sm:p-8 relative max-w-7xl mx-auto w-full gap-6">
        <div className="flex-1 w-full max-w-3xl">
          <AnimatePresence mode="wait">
            {showTransition ? (
              <motion.div
                key="transition"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="bg-white p-12 rounded-3xl border border-slate-200/80 shadow-md text-center flex flex-col items-center justify-center my-auto min-h-[380px]"
              >
                <div className="w-20 h-20 mb-6 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 animate-bounce">
                  {currentMode === "TEXT" && <BookOpen className="w-10 h-10" />}
                  {currentMode === "AUDIO" && <Volume2 className="w-10 h-10" />}
                  {currentMode === "VISUAL" && (
                    <ImageIcon className="w-10 h-10" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Adapting Learning Mode…
                </h2>
                <p className="text-slate-600 mt-2 text-sm">
                  Switching dynamically to{" "}
                  <strong className="text-emerald-700 font-bold">
                    {MODE_LABELS[currentMode]} Mode
                  </strong>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={currentQ.id + currentMode + currentIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-md"
              >
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 mb-4">
                    Subject: {currentQ.subject.toUpperCase()}
                  </div>

                  {(currentMode === "VISUAL" || currentQ.learningMode === "VISUAL") && (
                    <div className="relative overflow-hidden rounded-2xl mb-6 border border-slate-200 shadow-sm bg-slate-100 max-h-80">
                      <img
                        src={
                          currentQ.imageUrl && currentQ.imageUrl.trim().length > 5
                            ? currentQ.imageUrl
                            : "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80"
                        }
                        alt={`Visual context for ${currentQ.subject}`}
                        className="w-full h-64 sm:h-72 object-cover rounded-2xl"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80";
                        }}
                      />
                    </div>
                  )}

                  {currentMode === "AUDIO" && (
                    <button
                      onClick={() => speakText(currentQ.question)}
                      className="mx-auto w-16 h-16 bg-sky-100 text-sky-700 border border-sky-200 rounded-full flex items-center justify-center mb-6 hover:scale-105 transition-transform shadow-xs"
                      title="Click to re-listen"
                    >
                      <Volume2 className="w-8 h-8 animate-pulse" />
                    </button>
                  )}

                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">
                    {currentQ.question}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentQ.options.map((option, idx) => {
                    let btnClass =
                      "bg-[#FAF9F5] hover:bg-slate-100 border border-slate-200 text-slate-800 text-base py-4 text-left px-6 rounded-2xl transition-all font-bold relative flex items-center";

                    if (selectedAnswer === option) {
                      if (isCorrect)
                        btnClass =
                          "bg-emerald-50 border-2 border-emerald-500 text-emerald-900 text-base py-4 text-left px-6 rounded-2xl font-bold relative flex items-center";
                      else
                        btnClass =
                          "bg-rose-50 border-2 border-rose-400 text-rose-900 text-base py-4 text-left px-6 rounded-2xl font-bold relative flex items-center";
                    } else if (
                      selectedAnswer !== null &&
                      option === currentQ.answer
                    ) {
                      btnClass =
                        "bg-emerald-50 border-2 border-emerald-500 text-emerald-900 text-base py-4 text-left px-6 rounded-2xl font-bold relative flex items-center";
                    }

                    return (
                      <button
                        key={idx}
                        disabled={selectedAnswer !== null}
                        onClick={() => handleAnswer(option)}
                        className={btnClass}
                      >
                        <span className="inline-block w-8 h-8 rounded-xl bg-white text-center leading-8 mr-3 text-xs font-bold border border-slate-200 text-slate-700 shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className="w-full md:w-80 shrink-0">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center font-bold text-xs text-slate-900">
                <Camera className="w-4 h-4 mr-2 text-emerald-600" /> Live Eye
                Tracking
              </span>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center border ${faceDetected ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"}`}
              >
                <span
                  className={`w-2 h-2 rounded-full mr-1.5 ${faceDetected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
                />
                {faceDetected ? "Face Detected" : "No Face"}
              </span>
            </div>

            <div className="relative w-full h-40 bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
              />

              {!cameraActive && (
                <div className="p-4 text-center space-y-2">
                  <Eye className="w-8 h-8 text-emerald-400 mx-auto animate-pulse" />
                  <p className="text-xs text-slate-300 font-medium">
                    {cameraError || "Requesting camera permissions..."}
                  </p>
                </div>
              )}

              <div className="absolute inset-0 border border-emerald-400/30 rounded-2xl pointer-events-none flex items-center justify-center">
                <div
                  className={`w-14 h-14 border-2 rounded-full transition-all duration-300 ${faceDetected ? "border-amber-400 scale-100" : "border-rose-400 scale-90"}`}
                />
              </div>
            </div>

            <div className="space-y-3 pt-1 text-xs">
              <div className="flex justify-between items-center font-semibold">
                <span className="text-slate-500">Eye Gaze:</span>
                <span
                  className={`font-bold ${faceDetected ? "text-emerald-700" : "text-rose-600"}`}
                >
                  {gazeStatus}
                </span>
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span className="text-slate-500">Attention Score</span>
                  <span
                    className={
                      engagementScore >= 60
                        ? "text-emerald-700"
                        : engagementScore >= 30
                          ? "text-amber-700"
                          : "text-rose-700"
                    }
                  >
                    {engagementScore}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className={`h-full transition-all duration-300 ${engagementScore >= 60 ? "bg-emerald-500" : engagementScore >= 30 ? "bg-amber-500" : "bg-rose-500"}`}
                    style={{ width: `${engagementScore}%` }}
                  />
                </div>
              </div>

              {/* <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 text-xs text-emerald-900 space-y-1 font-medium">
                <div className="flex items-center font-bold text-emerald-800">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Gentle Adaptive AI
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  If focus drifts, NeuroLearn switches cards smoothly to keep learning stress-free!
                </p>
              </div> */}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default QuizPage;
