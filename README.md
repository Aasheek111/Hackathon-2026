# 🧠 NeuroLearn — Adaptive Learning Platform

> An adaptive learning platform that personalizes education for autistic students by identifying the learning mode that best maintains engagement.

[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](LICENSE)

---

## 🌟 Features

- **Adaptive Quiz** — 10-minute demo quiz that switches between Text, Audio, and Visual modes based on engagement
- **Computer Vision** — Optional webcam engagement tracking using OpenCV + MediaPipe Face Mesh
- **AR Learning Game** — Interactive 3D learning game (WebXR/A-Frame) for low-engagement learners
- **eSewa Payment** — Nepal-based payment gateway integration for subscriptions
- **Learning Analytics** — Personalized dashboard with engagement charts and mode recommendations

---

## 🏗️ Architecture

```
autism-learning-platform/
├── frontend/        ← React 18 + Vite + TypeScript + Tailwind CSS
├── backend/         ← Node.js + Express + Prisma + PostgreSQL
├── cv-service/      ← Python + FastAPI + OpenCV + MediaPipe
├── ar-game/         ← A-Frame WebXR Learning Game
└── docker-compose.yml
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- npm or pnpm

### 1. Clone and set up environment files

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your PostgreSQL URL, JWT secret, eSewa credentials

# Frontend  
cp frontend/.env.example frontend/.env
```

### 2. Start the Database

```bash
# With Docker (recommended)
docker compose up db -d

# Or use your local PostgreSQL instance
# and set DATABASE_URL in backend/.env
```

### 3. Set up the Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed          # Seeds questions, admin user, sample data
npm run dev           # Starts on http://localhost:5000
```

### 4. Set up the Frontend

```bash
cd frontend
npm install
npm run dev           # Starts on http://localhost:5173
```

### 5. Set up the CV Service (Optional)

```bash
cd cv-service
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 6. Open the AR Game

The AR game is a self-contained HTML file. It can be served statically or opened directly:
```bash
open ar-game/index.html
# Or serve it: npx serve ar-game -p 3001
```

---

## 🐳 Docker (Full Stack)

```bash
docker compose up --build
```

Services:
| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| CV Service | http://localhost:8000 |
| PostgreSQL | localhost:5432 |

---

## 🔑 Default Admin Credentials

After seeding:
- **Email**: admin@autismlearn.com
- **Password**: Admin@1234

> ⚠️ Change these immediately in production!

---

## 💳 eSewa Integration

1. Get sandbox credentials from [eSewa Developer Portal](https://developer.esewa.com.np/)
2. Set `ESEWA_MERCHANT_CODE` and `ESEWA_SECRET_KEY` in `backend/.env`
3. The sandbox URL is: `https://rc-epay.esewa.com.np/api/epay/main/v2/form`

---

## 🧠 CV Engagement Scoring

The CV service estimates engagement (0-100) using:
- **Face detection**: Is the student present?
- **Gaze direction**: Forward = highly engaged, Away = disengaged
- **Head pose**: Pitch/yaw/roll to detect looking away
- **Blink rate**: Momentary reduction in score

Mode switching triggers when 3 consecutive engagement scores average below 40.

---

## 📊 Learning Modes

| Mode | Description | Trigger |
|------|-------------|---------|
| 📖 Text | Written questions + options | Default start |
| 🎧 Audio | Text-to-Speech narration | Low engagement in Text |
| 🖼️ Visual | Image-based questions | Low engagement in Audio |
| 🎮 AR Game | 3D interactive balloon game | Low overall engagement |

---

## 🔐 API Documentation

Base URL: `http://localhost:5000/api`

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login + get JWT |
| POST | `/auth/logout` | Logout |
| POST | `/auth/forgot-password` | Request reset link |
| POST | `/auth/reset-password` | Reset with token |
| GET | `/auth/me` | Get current user |

### Quiz
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/quiz/start` | Start demo quiz |
| POST | `/quiz/answer` | Submit answer |
| POST | `/quiz/engagement` | Log engagement score |
| POST | `/quiz/complete` | Finish quiz |
| GET | `/quiz/result` | Get demo result |

### Subscription
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/subscription/plans` | List plans |
| POST | `/subscription/initiate` | Start eSewa payment |
| GET | `/subscription/verify` | eSewa callback |
| GET | `/subscription/status` | Current subscription |

---

## 🛡️ Privacy & Ethics

- Camera access requires **explicit user consent** at every session
- Engagement data is used only for adaptive learning, never for diagnosis
- No video recordings are stored — only real-time engagement scores
- Users can revoke camera permission at any time
- All personal data is encrypted and stored securely

---

## 📁 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express, Prisma ORM |
| Database | PostgreSQL |
| Auth | JWT, bcrypt |
| CV | Python, FastAPI, OpenCV, MediaPipe |
| AR | A-Frame, WebXR |
| Payment | eSewa v2 API |
| Charts | Recharts |

---

## 📄 License

MIT © 2025 NeuroLearn
