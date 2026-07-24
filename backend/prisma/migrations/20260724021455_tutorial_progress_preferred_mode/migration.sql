-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TutorialProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "currentLessonOrder" INTEGER NOT NULL DEFAULT 0,
    "preferredMode" TEXT NOT NULL DEFAULT 'TEXT',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TutorialProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TutorialProgress_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "TutorialCurriculum" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TutorialProgress" ("completed", "completedAt", "currentLessonOrder", "curriculumId", "id", "studentId", "updatedAt") SELECT "completed", "completedAt", "currentLessonOrder", "curriculumId", "id", "studentId", "updatedAt" FROM "TutorialProgress";
DROP TABLE "TutorialProgress";
ALTER TABLE "new_TutorialProgress" RENAME TO "TutorialProgress";
CREATE UNIQUE INDEX "TutorialProgress_studentId_curriculumId_key" ON "TutorialProgress"("studentId", "curriculumId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
