# 🎈 NeuroLearn AR Balloon-Popping Learning Game

An interactive 3D WebXR/AR learning game created for the **Autism Learning Platform**. Designed specifically for neurodiverse learners, this game features vibrant floating 3D balloons, gentle animations, sound effects, particle bursts, and high-contrast accessible UI overlays.

---

## 🌟 Key Features

- **Self-Contained Browser Experience**: Works in any modern web browser without requiring dedicated AR hardware or camera permissions.
- **3D Floating Interactive Balloons**: 4 colorful floating balloons rendered using A-Frame 1.5.0 with realistic glossy lighting and gentle floating physics.
- **Particle Burst & Pop Animations**: Satisfying visual and Web Audio API synthesizer pop sounds when popping the correct answer balloon.
- **Autism & Neurodiverse Accessibility**:
  - Soft, non-harsh color palette with a deep dark space background (`#0a0a0f`) and twinkling starfield.
  - Large, clear typography (Fredoka & Inter fonts) with semi-transparent high-contrast badges for answer options.
  - Encouraging positive reinforcement feedback and star ratings without overwhelming sensory triggers.
- **10 Interactive Questions**: Covers basic math, colors, logic, and general knowledge.
- **Responsive HTML Overlay**: Displays progress, live score, and full-screen results modal with "Try Again" and "Back to Dashboard" navigation options.

---

## 🚀 How to Run & Open

### Option 1: Direct File Opening (No Server Needed)
Double-click `/Users/aashikgautam/Documents/Hakcathon/autism-learning-platform/ar-game/index.html` or drag-and-drop `index.html` directly into any web browser (Chrome, Edge, Firefox, Safari).

### Option 2: Local HTTP Development Server
You can also host it via a lightweight local server:

```bash
# Using Python
cd /Users/aashikgautam/Documents/Hakcathon/autism-learning-platform/ar-game
python3 -m http.server 8080
```
Then open `http://localhost:8080` in your web browser.

---

## 🎮 How to Play

1. Read the question displayed in the center top glassmorphic panel.
2. Click or tap on the floating balloon in 3D space that contains the correct answer.
3. If correct: The balloon pops with particle effects, score increases, and a success chime plays.
4. If wrong: The balloon wobbles gently, turns red, and the correct balloon is highlighted.
5. After completing all 10 questions, view your score summary, star rating, and return to the main dashboard or play again!
