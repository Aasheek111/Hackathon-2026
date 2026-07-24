-- CreateTable
CREATE TABLE "TutorialStorybook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "curriculumId" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "errorMessage" TEXT,
    "celeryTaskId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TutorialStorybook_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "TutorialCurriculum" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StorybookPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storybookId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "storyText" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageQuery" TEXT,
    CONSTRAINT "StorybookPage_storybookId_fkey" FOREIGN KEY ("storybookId") REFERENCES "TutorialStorybook" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TutorialStorybook_curriculumId_key" ON "TutorialStorybook"("curriculumId");

-- CreateIndex
CREATE UNIQUE INDEX "StorybookPage_storybookId_pageNumber_key" ON "StorybookPage"("storybookId", "pageNumber");
