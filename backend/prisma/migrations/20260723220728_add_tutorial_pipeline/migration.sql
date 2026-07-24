-- CreateTable
CREATE TABLE "TutorialGenerationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "sourceDocumentId" TEXT,
    "teacherId" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'QUEUED',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "celeryTaskId" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TutorialGenerationJob_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TutorialGenerationJob_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "SyllabusDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TutorialGenerationJob_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TutorialCurriculum" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceChunks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TutorialCurriculum_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TutorialLesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "curriculumId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "example" TEXT,
    "imageUrl" TEXT,
    "audioUrl" TEXT,
    "sourceChunkStart" INTEGER,
    "sourceChunkEnd" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TutorialLesson_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "TutorialCurriculum" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnowledgeCheckQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct" TEXT NOT NULL,
    CONSTRAINT "KnowledgeCheckQuestion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "TutorialLesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnowledgeCheckAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "answeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KnowledgeCheckAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "KnowledgeCheckQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KnowledgeCheckAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinalAssessmentQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "curriculumId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct" TEXT NOT NULL,
    CONSTRAINT "FinalAssessmentQuestion_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "TutorialCurriculum" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinalAssessmentAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "curriculumId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "answerLog" JSONB NOT NULL,
    "scoreCorrect" INTEGER NOT NULL,
    "scoreTotal" INTEGER NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinalAssessmentAttempt_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "TutorialCurriculum" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FinalAssessmentAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TutorialProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "currentLessonOrder" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TutorialProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TutorialProgress_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "TutorialCurriculum" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "unitId" TEXT,
    "jobId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TutorialGenerationJob_unitId_idx" ON "TutorialGenerationJob"("unitId");

-- CreateIndex
CREATE INDEX "TutorialGenerationJob_teacherId_idx" ON "TutorialGenerationJob"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "TutorialCurriculum_unitId_key" ON "TutorialCurriculum"("unitId");

-- CreateIndex
CREATE INDEX "TutorialLesson_curriculumId_idx" ON "TutorialLesson"("curriculumId");

-- CreateIndex
CREATE UNIQUE INDEX "TutorialLesson_curriculumId_order_key" ON "TutorialLesson"("curriculumId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeCheckQuestion_lessonId_key" ON "KnowledgeCheckQuestion"("lessonId");

-- CreateIndex
CREATE INDEX "KnowledgeCheckAttempt_studentId_idx" ON "KnowledgeCheckAttempt"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeCheckAttempt_questionId_studentId_key" ON "KnowledgeCheckAttempt"("questionId", "studentId");

-- CreateIndex
CREATE INDEX "FinalAssessmentQuestion_curriculumId_idx" ON "FinalAssessmentQuestion"("curriculumId");

-- CreateIndex
CREATE UNIQUE INDEX "FinalAssessmentQuestion_curriculumId_order_key" ON "FinalAssessmentQuestion"("curriculumId", "order");

-- CreateIndex
CREATE INDEX "FinalAssessmentAttempt_studentId_curriculumId_idx" ON "FinalAssessmentAttempt"("studentId", "curriculumId");

-- CreateIndex
CREATE UNIQUE INDEX "TutorialProgress_studentId_curriculumId_key" ON "TutorialProgress"("studentId", "curriculumId");

-- CreateIndex
CREATE INDEX "Notification_teacherId_read_idx" ON "Notification"("teacherId", "read");
