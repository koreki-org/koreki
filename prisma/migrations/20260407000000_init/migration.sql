-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "logtoId" TEXT,
    "username" TEXT,
    "hasProAccess" BOOLEAN NOT NULL DEFAULT false,
    "ocrCreditsUsed" INTEGER NOT NULL DEFAULT 0,
    "correctionCreditsUsed" INTEGER NOT NULL DEFAULT 0,
    "ocrInputTokens" INTEGER NOT NULL DEFAULT 0,
    "ocrOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "correctionInputTokens" INTEGER NOT NULL DEFAULT 0,
    "correctionOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "stripeCustomerId" TEXT,
    "totalCreditsPurchased" INTEGER NOT NULL DEFAULT 0,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appMode" TEXT NOT NULL DEFAULT 'UNSET',
    "activeWorkspaceId" TEXT,
    "activePromptProfileId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PERSONAL',
    "credits" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "avvAccepted" BOOLEAN NOT NULL DEFAULT false,
    "avvFileUrl" TEXT,
    "inviteCode" TEXT,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "ocrMonthlyUsage" INTEGER NOT NULL DEFAULT 0,
    "correctionMonthlyUsage" INTEGER NOT NULL DEFAULT 0,
    "lastResetMonth" INTEGER NOT NULL DEFAULT 1,
    "lastResetYear" INTEGER NOT NULL DEFAULT 2024,
    "ocrPricePerMillion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "correctionPricePerMillion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ocrBudget" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "correctionBudget" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "correctionPrompt" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "workspaceId" TEXT,
    "action" TEXT NOT NULL,
    "confirmedText" TEXT NOT NULL,
    "avvVersion" TEXT,
    "avvHash" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "correctionPrompt" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedStripeSession" (
    "sessionId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedStripeSession_pkey" PRIMARY KEY ("sessionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_logtoId_key" ON "User"("logtoId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_inviteCode_key" ON "Workspace"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_workspaceId_key" ON "Membership"("userId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptProfile_name_userId_key" ON "PromptProfile"("name", "userId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyLog" ADD CONSTRAINT "PrivacyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyLog" ADD CONSTRAINT "PrivacyLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptProfile" ADD CONSTRAINT "PromptProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

