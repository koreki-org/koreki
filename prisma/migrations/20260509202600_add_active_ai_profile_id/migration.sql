-- AlterTable: Add activeAiProfileId to User
-- Mirrors the existing activePromptProfileId pattern for AI parameter profile persistence.
ALTER TABLE "User" ADD COLUMN "activeAiProfileId" TEXT;
