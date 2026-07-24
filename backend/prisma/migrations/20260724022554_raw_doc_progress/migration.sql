-- CreateTable
CREATE TABLE "RawDocProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "lastPage" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RawDocProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RawDocProgress_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "SyllabusDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RawDocProgress_studentId_idx" ON "RawDocProgress"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "RawDocProgress_studentId_documentId_key" ON "RawDocProgress"("studentId", "documentId");
