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
    grade_level: str | None = Field(
        default=None,
        description="Admin-set target education level (e.g. 'Nursery', 'Grade 3') - steers vocabulary and examples.",
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


class GenerateVisualRequest(BaseModel):
    unit_id: int = Field(..., ge=1, description="Used only to namespace the generated filename")
    prompt: str = Field(..., min_length=1, description="Description of the picture to generate")
    image_query: str | None = Field(
        default=None,
        description="Model-written photo-search phrase for this lesson - more relevant than the raw prompt.",
    )


class GenerateCurriculumRequest(BaseModel):
    job_id: str = Field(..., min_length=1, description="The TutorialGenerationJob id to report progress against")
    unit_id: int = Field(..., ge=1, description="Which unit's indexed document to build a curriculum from")
    grade_level: str | None = Field(
        default=None,
        description="Admin-set target education level (e.g. 'Nursery', 'Grade 3') - steers vocabulary and examples.",
    )


class GenerateStorybookRequest(BaseModel):
    storybook_id: str = Field(..., min_length=1, description="The TutorialStorybook id to report progress against")
    unit_id: int = Field(..., ge=1, description="Which unit's indexed document to build the story from")
    curriculum_title: str = Field(..., min_length=1, description="The curriculum's own title, grounds the story's topic")
    grade_level: str | None = Field(
        default=None,
        description="Admin-set target education level (e.g. 'Nursery', 'Grade 3') - steers vocabulary and tone.",
    )


class GenerateYoutubeQuizRequest(BaseModel):
    quiz_id: str = Field(..., min_length=1, description="The YoutubeQuiz id to report progress against")
    video_id: str = Field(..., min_length=1, description="The extracted YouTube video id")


class ExtractYoutubeIdRequest(BaseModel):
    url: str = Field(..., min_length=1, description="A youtube.com/watch, youtube.com/shorts, or youtu.be URL")


class ExtractYoutubeIdResponse(BaseModel):
    video_id: str


class GenerateSpeechRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Text to synthesize into speech")
    voice: str = Field(default="Achernar", description="A Gemini TTS prebuilt voice name")


class GenerateSpeechResponse(BaseModel):
    status: str
    audio_url: str


class HealthResponse(BaseModel):
    status: str
    service: str = "neurolearn-rag"
    ai_key_configured: bool
    processed_units: list[int]
