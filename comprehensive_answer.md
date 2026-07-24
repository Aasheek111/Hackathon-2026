# Pragya — Comprehensive System Design and Overview

## 1. System Design & Architecture

### High-Level Architecture
Pragya is designed as a modular, scalable full-stack EdTech platform catering to inclusive and adaptive learning. The architecture separates concerns into specialized microservices and frontend components to maintain a seamless experience while optimizing for heavy operations (like AI generation and computer vision).

- **Frontend (React 18 + Vite + Tailwind CSS):** A responsive, accessible single-page application (SPA). It manages user context, accessibility preferences (font size, contrast, text-to-speech), and adaptive routing based on disability profiles. The frontend dynamically renders the appropriate UI (e.g., visual dashboard vs audio-first dashboard) while keeping a single unified curriculum core.
- **Backend (Node.js + Express + Prisma):** Serves as the primary CRUD API and orchestrates complex business logic. It handles authentication, user segregation, database queries, and background job queuing for AI generation.
- **Database (PostgreSQL):** A robust relational database modeling users, classrooms, curriculums, tracking metrics (engagement, scores), and accessibility preferences.
- **Computer Vision Service (Python + FastAPI + OpenCV/MediaPipe):** An isolated microservice handling real-time webcam frames to compute engagement metrics (head pose, gaze, blink rate). This separation ensures the Node.js event loop isn't blocked by heavy mathematical tensor processing.
- **AI / RAG Pipeline:** Generates adaptive content (Text, Audio, Visual) from teacher-uploaded PDFs. Processes happen asynchronously using background workers to compile canonical curriculums.

### Adaptive Segregation System
Rather than forcing students into separate apps, Pragya uses a **single canonical curriculum model** mapped to a dynamic presentation layer. When a student registers, they specify a `disabilityType` (or "Prefer not to say"). This choice routes them to a specialized dashboard but doesn't alter the core syllabus. 
- A student choosing `DEAFNESS` or `Prefer not to say` will have access to Sign Language modes and visual-heavy cues.
- The platform transitions gracefully between learning modes based on live engagement scores from the CV service.

### Therapeutic & Clinical Applications
Beyond traditional schooling, Pragya is highly effective as a **Therapy and Rehabilitation Tool**. 
- **Speech Therapy & Occupational Therapy:** The adaptive AR and interactive modes can be used by clinical therapists to provide engaging exercises for children with speech or motor delays.
- **Behavioral Therapy for Autism:** The CV-based engagement tracking acts as a quantifiable metric for behavioral therapists to monitor attention spans over time, helping adjust interventions without relying solely on subjective observation.
- **At-Home Reinforcement:** Therapists can assign targeted interactive syllabus for parents to run at home, maintaining continuity of care outside the clinic.

---

## 2. Compliance Framework

When dealing with children, disability data, and educational content, compliance is the highest priority.

### Nepal-Specific Compliance
- **The Privacy Act, 2075 (2018):** Pragya ensures that personal data (especially sensitive health/disability data) is collected only with explicit consent. Data is strictly used for platform adaptation and never shared.
- **National Education Policy, 2076:** Aligns with the government's push for inclusive education and technology integration in rural/urban schools. The platform's capability to run adaptive lessons supports individualized education plans (IEPs).
- **Electronic Transactions Act, 2063:** Secures digital transactions (eSewa integration) and protects electronic records against unauthorized access.

### International Compliance
- **COPPA (Children's Online Privacy Protection Act - USA):**
  - **No raw data stored:** The CV tracking service processes frames in real-time and discards them instantly. Only computed, abstracted engagement scores (e.g., `85%`) are stored.
  - **Parental Consent:** The system requires explicit consent before turning on the webcam.
- **FERPA (Family Educational Rights and Privacy Act - USA):**
  - Academic records (scores, progression) are strictly gated. Only the assigned teacher and the student/parent can view performance dashboards.
- **GDPR (General Data Protection Regulation - EU):**
  - Built with "Privacy by Design". Users have the "Right to be Forgotten" (complete account deletion cascaded through Prisma).
- **WCAG 2.1 AA (Web Content Accessibility Guidelines):**
  - High contrast modes, keyboard-navigable audio dashboards, screen-reader compatibility (ARIA), and scalable text ensure compliance with international accessibility laws.

---

## 3. Sustainable Business Model

Monetizing a social-impact EdTech platform requires a hybrid approach. Direct charging to disabled learners or underfunded public schools is not feasible or ethical.

**1. B2B (Business-to-Business) / School Licensing (Freemium)**
- **Public Schools / NGOs:** Free basic access.
- **Private & Elite Schools:** Charged a tiered subscription (via eSewa/Khalti) for advanced analytics, unlimited AI syllabus generation, and premium AR content. This creates a cross-subsidy model where private institutions fund public access.

**2. B2G (Business-to-Government) Partnerships**
- Partner with the Ministry of Education, Science and Technology (MoEST) in Nepal to license the software as the official tool for special education centers. Government grants and CSR (Corporate Social Responsibility) funds from telecom companies (NTC, Ncell) can sustain operations.

**3. CSR Sponsorships & Philanthropy**
- Corporations can sponsor specific classrooms or modules. In return, they get impact reports showcasing how their funds helped neurodivergent students achieve higher learning outcomes.

**4. API Licensing**
- Pragya’s unique CV-based engagement tracking and accessible AI content generation can be exposed as an API/SDK for other EdTech platforms globally, creating a recurring SaaS revenue stream without charging the end users.
