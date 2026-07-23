-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "teacherStatus" TEXT,
    "teacherNote" TEXT,
    "rememberMe" BOOLEAN NOT NULL DEFAULT false,
    "resetToken" TEXT,
    "resetTokenExp" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DemoResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "textEngagement" REAL NOT NULL DEFAULT 0,
    "audioEngagement" REAL NOT NULL DEFAULT 0,
    "visualEngagement" REAL NOT NULL DEFAULT 0,
    "arRecommended" BOOLEAN NOT NULL DEFAULT false,
    "preferredMode" TEXT NOT NULL DEFAULT 'TEXT',
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DemoResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT NOT NULL DEFAULT 'eSewa',
    "transactionId" TEXT,
    "startDate" DATETIME,
    "expiryDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "answer" TEXT NOT NULL,
    "imageUrl" TEXT,
    "audioText" TEXT,
    "learningMode" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "ageGroup" TEXT NOT NULL DEFAULT 'all',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LearningMaterial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "learningMode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "QuizSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "currentMode" TEXT NOT NULL DEFAULT 'TEXT',
    "questionIndex" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "engagementLog" JSONB NOT NULL DEFAULT [],
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "QuizSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssessmentAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "textEngagement" REAL NOT NULL DEFAULT 0,
    "audioEngagement" REAL NOT NULL DEFAULT 0,
    "visualEngagement" REAL NOT NULL DEFAULT 0,
    "attentionSpanScore" REAL NOT NULL DEFAULT 0,
    "adaptationCount" INTEGER NOT NULL DEFAULT 0,
    "preferredMode" TEXT NOT NULL DEFAULT 'TEXT',
    "arRecommended" BOOLEAN NOT NULL DEFAULT false,
    "scoreCorrect" INTEGER NOT NULL DEFAULT 0,
    "scoreTotal" INTEGER NOT NULL DEFAULT 0,
    "scorePercent" REAL NOT NULL DEFAULT 0,
    "engagementLog" JSONB NOT NULL DEFAULT [],
    "answerLog" JSONB NOT NULL DEFAULT [],
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "durationSeconds" INTEGER,
    CONSTRAINT "AssessmentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "teacherId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Classroom_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdmissionCriteria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classroomId" TEXT NOT NULL,
    "minTextEngagement" REAL,
    "maxTextEngagement" REAL,
    "minAudioEngagement" REAL,
    "maxAudioEngagement" REAL,
    "minVisualEngagement" REAL,
    "maxVisualEngagement" REAL,
    "preferredModes" JSONB,
    "minAttentionSpanScore" REAL,
    "maxAttentionSpanScore" REAL,
    "minScorePercent" REAL,
    "maxScorePercent" REAL,
    "arRecommendedOnly" BOOLEAN,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdmissionCriteria_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Enrolment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classroomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Enrolment_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Enrolment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClassroomJoinRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classroomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "matchScore" REAL NOT NULL,
    "matchReasons" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "teacherNote" TEXT,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" DATETIME,
    CONSTRAINT "ClassroomJoinRequest_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassroomJoinRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classroomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Subject_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subjectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "ragUnitId" INTEGER,
    "indexStatus" TEXT NOT NULL DEFAULT 'NOT_INDEXED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Unit_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyllabusDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "pageCount" INTEGER,
    "chunkCount" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'NOT_INDEXED',
    "errorMessage" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyllabusDocument_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SyllabusDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tutorial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "learningMode" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "tutorialText" TEXT NOT NULL,
    "audioScript" TEXT NOT NULL,
    "visualSuggestion" TEXT NOT NULL,
    "steps" JSONB NOT NULL DEFAULT [],
    "quiz" JSONB NOT NULL,
    "teacherNote" TEXT NOT NULL,
    "sourceChunks" INTEGER NOT NULL DEFAULT 0,
    "offline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tutorial_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Tutorial_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" DATETIME,
    "badges" JSONB NOT NULL DEFAULT [],
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudentProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DemoResult_userId_key" ON "DemoResult"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_userId_completedAt_idx" ON "AssessmentAttempt"("userId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_teacherId_key" ON "Classroom"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionCriteria_classroomId_key" ON "AdmissionCriteria"("classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrolment_classroomId_studentId_key" ON "Enrolment"("classroomId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomJoinRequest_classroomId_studentId_key" ON "ClassroomJoinRequest"("classroomId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_ragUnitId_key" ON "Unit"("ragUnitId");

-- CreateIndex
CREATE INDEX "Tutorial_studentId_unitId_idx" ON "Tutorial"("studentId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "Tutorial_studentId_unitId_learningMode_level_key" ON "Tutorial"("studentId", "unitId", "learningMode", "level");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProgress_studentId_key" ON "StudentProgress"("studentId");
