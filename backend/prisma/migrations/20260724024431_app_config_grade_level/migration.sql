-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "gradeLevel" TEXT NOT NULL DEFAULT 'Nursery',
    "updatedAt" DATETIME NOT NULL
);
