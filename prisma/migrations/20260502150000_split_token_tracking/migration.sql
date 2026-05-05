-- AlterTable
ALTER TABLE "SystemSettings" ADD COLUMN     "correctionInputMonthlyUsage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "correctionInputPricePerMillion" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "correctionOutputMonthlyUsage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "correctionOutputPricePerMillion" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "ocrInputMonthlyUsage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ocrInputPricePerMillion" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "ocrOutputMonthlyUsage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ocrOutputPricePerMillion" DOUBLE PRECISION NOT NULL DEFAULT 0;
