-- Extends the InterviewRound table added in 20260812173000 — it is NOT
-- rebuilt: every existing column and row is left exactly as it is.
--
-- Purely additive (one new enum + four NULLable columns), so there is no
-- backfill and no ordering hazard like the one the previous migration had
-- to work around: existing rows simply get NULL for all four.
--
-- "result" is separate from "status" on purpose. status = did the meeting
-- happen (SCHEDULED/COMPLETED/CANCELLED); result = how did it turn out
-- (PASSED/FAILED/WAITING). It is NULLable because a round that hasn't
-- happened yet has no outcome to record.

-- CreateEnum
CREATE TYPE "InterviewRoundResult" AS ENUM ('PASSED', 'FAILED', 'WAITING');

-- AlterTable
ALTER TABLE "InterviewRound" ADD COLUMN     "interviewerFeedback" TEXT,
ADD COLUMN     "personalNotes" TEXT,
ADD COLUMN     "result" "InterviewRoundResult",
ADD COLUMN     "roundNumber" INTEGER;
