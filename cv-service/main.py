import base64
import math
from typing import Dict, List, Optional
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="NeuroLearn CV Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)
eye_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_eye_tree_eyeglasses.xml"
)

# Simple in-memory blink history dict (session_id -> list of recent blink states, max 30 entries)
blink_history_store: Dict[str, List[bool]] = {}


class FrameRequest(BaseModel):
    frame: str  # base64-encoded JPEG
    session_id: str


class EngagementResponse(BaseModel):
    engagement_score: float  # 0-100
    face_detected: bool
    gaze: str  # 'forward', 'left', 'right', 'up', 'down', 'away'
    blink_detected: bool
    head_pose: dict  # pitch, yaw, roll


def decode_frame(base64_str: str) -> np.ndarray:
    """
    Decode base64 string to OpenCV image (BGR).
    Handles data URL prefix (e.g., 'data:image/jpeg;base64,') if present.
    """
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",", 1)[1]
        image_bytes = base64.b64decode(base64_str)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not decode image from base64 data"
            )
        return img
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to decode base64 frame: {str(e)}"
        )


def detect_opencv_faces(img: np.ndarray) -> List[tuple[int, int, int, int]]:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.12,
        minNeighbors=5,
        minSize=(48, 48),
        flags=cv2.CASCADE_SCALE_IMAGE
    )
    return sorted(faces, key=lambda face: face[2] * face[3], reverse=True)


def analyze_face_with_opencv(img: np.ndarray) -> tuple[bool, str, bool, dict, int]:
    """
    OpenCV-only face/eye analysis.
    Returns: face_detected, gaze, blink_detected, approximate head_pose, eye_count.
    """
    image_height, image_width, _ = img.shape
    faces = detect_opencv_faces(img)
    if not faces:
        return False, "away", False, {"pitch": 0.0, "yaw": 0.0, "roll": 0.0}, 0

    x, y, w, h = faces[0]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    upper_face = gray[y:y + int(h * 0.58), x:x + w]
    eyes = eye_cascade.detectMultiScale(
        cv2.equalizeHist(upper_face),
        scaleFactor=1.08,
        minNeighbors=4,
        minSize=(18, 12),
        flags=cv2.CASCADE_SCALE_IMAGE
    )

    eye_count = min(len(eyes), 2)
    face_center_x = (x + w / 2.0) / image_width
    face_center_y = (y + h / 2.0) / image_height
    face_area_ratio = (w * h) / float(image_width * image_height)

    yaw = max(-45.0, min(45.0, (face_center_x - 0.5) * 90.0))
    pitch = max(-45.0, min(45.0, (face_center_y - 0.5) * 70.0))
    roll = 0.0

    if len(eyes) >= 2:
        sorted_eyes = sorted(eyes, key=lambda eye: eye[0])[:2]
        left_eye, right_eye = sorted_eyes[0], sorted_eyes[1]
        dy = (left_eye[1] + left_eye[3] / 2.0) - (right_eye[1] + right_eye[3] / 2.0)
        dx = max(1.0, (right_eye[0] + right_eye[2] / 2.0) - (left_eye[0] + left_eye[2] / 2.0))
        roll = max(-45.0, min(45.0, math.degrees(math.atan2(dy, dx))))

    if eye_count < 1:
        gaze = "away"
    elif face_area_ratio < 0.035:
        gaze = "away"
    elif face_center_x < 0.38:
        gaze = "left"
    elif face_center_x > 0.62:
        gaze = "right"
    elif face_center_y < 0.36:
        gaze = "up"
    elif face_center_y > 0.68:
        gaze = "down"
    else:
        gaze = "forward"

    blink = eye_count == 0
    return True, gaze, blink, {
        "pitch": round(pitch, 2),
        "yaw": round(yaw, 2),
        "roll": round(roll, 2)
    }, eye_count


def calculate_engagement(
    face_detected: bool,
    gaze: str,
    blink: bool,
    head_pose: dict,
    blink_history: Optional[List[bool]] = None
) -> float:
    """
    Score 0-100:
    - If no face: return 0
    - Start with base 70
    - If gaze == 'forward': +20
    - If gaze in ('left', 'right'): +5 (looking around, somewhat engaged)
    - If gaze == 'away': -20
    - If blink: -5 (blinking momentarily reduces score)
    - If abs(head_pose['yaw']) > 30: -15 (looking away)
    - If abs(head_pose['pitch']) > 25: -10 (looking down)
    - Clamp to [0, 100]
    - Return float
    """
    if not face_detected:
        return 0.0

    score = 70.0

    if gaze == 'forward':
        score += 20.0
    elif gaze in ('left', 'right'):
        score += 5.0
    elif gaze == 'away':
        score -= 20.0

    if blink:
        score -= 5.0

    if abs(head_pose.get('yaw', 0.0)) > 30.0:
        score -= 15.0

    if abs(head_pose.get('pitch', 0.0)) > 25.0:
        score -= 10.0

    score = max(0.0, min(100.0, score))
    return round(score, 2)


@app.post("/analyze-frame", response_model=EngagementResponse)
async def analyze_frame(request: FrameRequest):
    img = decode_frame(request.frame)

    face_detected, gaze, blink, head_pose, eye_count = analyze_face_with_opencv(img)

    if not face_detected:
        if request.session_id not in blink_history_store:
            blink_history_store[request.session_id] = []
        blink_history_store[request.session_id].append(False)
        if len(blink_history_store[request.session_id]) > 30:
            blink_history_store[request.session_id].pop(0)

        return EngagementResponse(
            engagement_score=0.0,
            face_detected=False,
            gaze="away",
            blink_detected=False,
            head_pose={"pitch": 0.0, "yaw": 0.0, "roll": 0.0}
        )

    # Maintain in-memory session blink history (max 30 entries)
    if request.session_id not in blink_history_store:
        blink_history_store[request.session_id] = []
    session_history = blink_history_store[request.session_id]
    session_history.append(blink)
    if len(session_history) > 30:
        session_history.pop(0)

    score = calculate_engagement(
        face_detected=True,
        gaze=gaze,
        blink=blink,
        head_pose=head_pose,
        blink_history=session_history
    )

    return EngagementResponse(
        engagement_score=score,
        face_detected=True,
        gaze=gaze,
        blink_detected=blink,
        head_pose=head_pose
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "NeuroLearn CV Service"}


@app.get("/")
async def root():
    return {
        "service": "NeuroLearn CV Service",
        "version": "1.0.0",
        "status": "running"
    }
