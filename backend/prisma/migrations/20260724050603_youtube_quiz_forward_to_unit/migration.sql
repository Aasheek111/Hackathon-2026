-- CreateTable
CREATE TABLE "YoutubeQuizAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "scoreCorrect" INTEGER NOT NULL DEFAULT 0,
    "scoreTotal" INTEGER NOT NULL DEFAULT 0,
    "answerLog" JSONB NOT NULL DEFAULT [],
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "YoutubeQuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "YoutubeQuiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "YoutubeQuizAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_YoutubeQuiz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "errorMessage" TEXT,
    "title" TEXT,
    "unitId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "YoutubeQuiz_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "YoutubeQuiz_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_YoutubeQuiz" ("createdAt", "errorMessage", "id", "sourceUrl", "status", "teacherId", "title", "updatedAt", "videoId") SELECT "createdAt", "errorMessage", "id", "sourceUrl", "status", "teacherId", "title", "updatedAt", "videoId" FROM "YoutubeQuiz";
DROP TABLE "YoutubeQuiz";
ALTER TABLE "new_YoutubeQuiz" RENAME TO "YoutubeQuiz";
CREATE INDEX "YoutubeQuiz_unitId_idx" ON "YoutubeQuiz"("unitId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "YoutubeQuizAttempt_quizId_studentId_idx" ON "YoutubeQuizAttempt"("quizId", "studentId");
