"""Request and response shapes.

The tutorial response is pinned exactly, because the frontend and the marking
script both read these five keys.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class TutorialRequest(BaseModel):
    unit_id: int = Field(..., ge=1, description="Which unit to build a tutorial from")
    student_diagnosis: str | None = Field(
        default=None,
        description="Free text, e.g. 'Struggling with fractions, dyslexic'. Used as the retrieval query.",
    )
    # matches the LearningMode enum in backend/prisma/schema.prisma, so the
    # platform's mode-switch can ask for the same unit in a different form
    learning_mode: Literal["TEXT", "AUDIO", "VISUAL", "AR"] = Field(
        default="TEXT",
        description="Shapes the output: AUDIO puts the teaching in the narration, VISUAL leads with the diagram.",
    )


class QuizItem(BaseModel):
    question: str
    options: list[str]
    correct: str


class TutorialStep(BaseModel):
    concept: str
    explanation: str
    example: str = ""


class TutorialResponse(BaseModel):
    tutorial_text: str
    audio_script: str
    visual_suggestion: str
    steps: list[TutorialStep] = []
    quiz: list[QuizItem]
    teacher_note: str
    source_chunks: int = 0
    learning_mode: str = "TEXT"
    # true when built without an API key - the UI shows a banner for this
    offline: bool = False


class PdfUploadResponse(BaseModel):
    status: str
    unit_id: int
    chunks: int


class ImageUploadResponse(BaseModel):
    status: str
    image_url: str


class HealthResponse(BaseModel):
    status: str
    service: str = "neurolearn-rag"
    ai_key_configured: bool
    processed_units: list[int]
