-- AlterTable
ALTER TABLE "Tutorial" ADD COLUMN "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "UnitPreview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "tutorialText" TEXT,
    "visualSuggestion" TEXT,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_INDEXED',
    "errorMessage" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnitPreview_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UnitPreview_unitId_key" ON "UnitPreview"("unitId");
