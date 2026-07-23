# NeuroLearn Computer Vision Service

A FastAPI microservice providing real-time computer vision analysis for the Autism Learning Platform. Utilizing MediaPipe Face Mesh and OpenCV, this service processes video frames sent from the frontend webcam stream to compute user engagement scores, gaze direction, blink detection, and 3D head pose estimation.

---

## Features

- **Real-Time Frame Analysis (`/analyze-frame`)**: Decodes base64 JPEG images and runs MediaPipe Face Mesh processing.
- **Engagement Scoring**: Computes a dynamic 0-100 engagement score based on face presence, gaze direction, blink state, and head rotation.
- **Gaze Direction Estimation**: Estimates gaze direction (`forward`, `left`, `right`, `up`, `down`, `away`) using iris positions and relative eye landmark geometries.
- **Blink Detection**: Calculates Eye Aspect Ratio (EAR) for both eyes and maintains per-session blink history smoothing.
- **Head Pose Estimation**: Computes 3D pitch, yaw, and roll angles in degrees using Perspective-n-Point (PnP) pose solver on facial landmarks.
- **Health Check & Root Status**: Clean monitoring endpoints (`/health`, `/`).

---

## Setup & Installation

### Prerequisites

- Python 3.9+ installed on your system.

### Installation Steps

1. **Navigate to the service directory**:
   ```bash
   cd /Users/aashikgautam/Documents/Hakcathon/autism-learning-platform/cv-service
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Setup** (Optional):
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

---

## Running the Service

Start the Uvicorn development server:

```bash
uvicorn main:app --reload --port 8000
```

The service will be accessible at `http://localhost:8000`. Direct your browser to `http://localhost:8000/docs` to view the interactive Swagger API documentation.

---

## API Endpoints Reference

### `POST /analyze-frame`

Analyzes a single webcam frame (base64 encoded) and updates session history.

**Request Body:**
```json
{
  "frame": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "session_id": "session-xyz-123"
}
```

**Response Body:**
```json
{
  "engagement_score": 85.0,
  "face_detected": true,
  "gaze": "forward",
  "blink_detected": false,
  "head_pose": {
    "pitch": -2.15,
    "yaw": 1.40,
    "roll": 0.50
  }
}
```

---

### `GET /health`

Health check endpoint for service status monitoring.

**Response:**
```json
{
  "status": "ok",
  "service": "NeuroLearn CV Service"
}
```

---

### `GET /`

Root endpoint providing basic service metadata.

**Response:**
```json
{
  "service": "NeuroLearn CV Service",
  "version": "1.0.0",
  "status": "running"
}
```

---

## Engagement Scoring Breakdown

The engagement score is calculated on a 0–100 scale:

1. **No Face Detected**:
   - Immediately returns minimum score of **10.0** with `gaze: 'away'`.

2. **Base Score**:
   - Begins at **70.0** when a face is present.

3. **Gaze Modifiers**:
   - `forward`: **+20.0** (direct focus on learning material)
   - `left` / `right`: **+5.0** (exploring screen/environment, partially engaged)
   - `away`: **-20.0** (looking away from camera)

4. **Blink Penalty**:
   - `blink_detected == True`: **-5.0** (momentary dip during eyelid closure)

5. **Head Pose Penalties**:
   - `|yaw| > 30°`: **-15.0** (head turned away from screen)
   - `|pitch| > 25°`: **-10.0** (head tilted significantly down or up)

6. **Clamping & Bounds**:
   - Score is clamped between **0.0** and **100.0**.
