-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "appliedVia" TEXT,
ADD COLUMN     "interviewAt" TIMESTAMP(3),
ADD COLUMN     "interviewRound" TEXT,
ADD COLUMN     "joiningDate" TIMESTAMP(3),
ADD COLUMN     "offeredCtc" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "rejectionStage" TEXT;
