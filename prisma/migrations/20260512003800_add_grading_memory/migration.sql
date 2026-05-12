-- CreateTable: Create GradingMemory table
CREATE TABLE "GradingMemory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cases" JSONB NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradingMemory_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Add activeGradingMemoryId to User
ALTER TABLE "User" ADD COLUMN "activeGradingMemoryId" TEXT;

-- CreateIndex: Create unique index on GradingMemory
CREATE UNIQUE INDEX "GradingMemory_name_userId_key" ON "GradingMemory"("name", "userId");

-- AddForeignKey: Add foreign key constraint from GradingMemory to User
ALTER TABLE "GradingMemory" ADD CONSTRAINT "GradingMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
