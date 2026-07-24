-- CreateTable
CREATE TABLE "UnitEngagementSample" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "lessonOrder" INTEGER NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'TEXT',
    "totalScore" REAL NOT NULL DEFAULT 0,
    "samples" INTEGER NOT NULL DEFAULT 0,
    "focusedSamples" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnitEngagementSample_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnitEngagementSample_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UnitEngagementSample_unitId_idx" ON "UnitEngagementSample"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitEngagementSample_studentId_unitId_lessonOrder_key" ON "UnitEngagementSample"("studentId", "unitId", "lessonOrder");
