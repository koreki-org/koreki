-- CreateTable
CREATE TABLE "AiProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "topP" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "maxTokens" INTEGER NOT NULL DEFAULT 32768,
    "presencePenalty" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "enableThinking" BOOLEAN NOT NULL DEFAULT false,
    "visionTemperature" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "visionTopP" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "visionMaxTokens" INTEGER NOT NULL DEFAULT 4000,
    "visionPresencePenalty" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiProfile_name_userId_key" ON "AiProfile"("name", "userId");

-- AddForeignKey
ALTER TABLE "AiProfile" ADD CONSTRAINT "AiProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
