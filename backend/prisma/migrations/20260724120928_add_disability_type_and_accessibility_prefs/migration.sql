-- AlterTable
ALTER TABLE "User" ADD COLUMN "disabilityType" TEXT;

-- CreateTable
CREATE TABLE "AccessibilityPrefs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "fontSize" TEXT NOT NULL DEFAULT 'MEDIUM',
    "highContrast" BOOLEAN NOT NULL DEFAULT false,
    "alwaysNarrate" BOOLEAN NOT NULL DEFAULT false,
    "reducedMotion" BOOLEAN NOT NULL DEFAULT false,
    "signLanguage" BOOLEAN NOT NULL DEFAULT false,
    "audiobookMode" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccessibilityPrefs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AccessibilityPrefs_studentId_key" ON "AccessibilityPrefs"("studentId");
