-- AlterTable: Add activeSkillProfileId to User
ALTER TABLE "User" ADD COLUMN "activeSkillProfileId" TEXT;

-- CreateTable: Create SkillProfile table
CREATE TABLE "SkillProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activeSkillIds" JSONB NOT NULL DEFAULT '[]',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Create unique index on SkillProfile
CREATE UNIQUE INDEX "SkillProfile_name_userId_key" ON "SkillProfile"("name", "userId");

-- CreateIndex: Create index on foreign key userId
CREATE INDEX "SkillProfile_userId_idx" ON "SkillProfile"("userId");

-- AddForeignKey: Add foreign key constraint from SkillProfile to User
ALTER TABLE "SkillProfile" ADD CONSTRAINT "SkillProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
