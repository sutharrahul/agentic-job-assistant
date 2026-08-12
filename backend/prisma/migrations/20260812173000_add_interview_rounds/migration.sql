-- Replaces Application.interviewRound/interviewAt (which could hold only
-- ONE round, overwritten every time) with a real InterviewRound table.
--
-- Statement ORDER matters here and differs from what `prisma migrate diff`
-- generates: the generated script drops the old columns BEFORE creating the
-- table, which would destroy the data the backfill below needs to read.

-- CreateEnum
CREATE TYPE "InterviewRoundStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "InterviewRound" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "interviewer" TEXT,
    "status" "InterviewRoundStatus" NOT NULL DEFAULT 'SCHEDULED',
    "selfRating" INTEGER,
    "questionsAsked" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whatWentWell" TEXT,
    "whatToImprove" TEXT,
    "thankYouNoteSent" BOOLEAN NOT NULL DEFAULT false,
    "expectedResponseBy" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewRound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterviewRound_applicationId_idx" ON "InterviewRound"("applicationId");

-- AddForeignKey
ALTER TABLE "InterviewRound" ADD CONSTRAINT "InterviewRound_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: preserve any interview data recorded before per-round tracking
-- existed, as a single best-effort round. This matched zero rows on the dev
-- database it was written against, but is kept because this same migration
-- runs against production via `prisma migrate deploy` in the Render build.
--
-- gen_random_uuid() (built into Postgres 13+) rather than a Prisma default:
-- @default(uuid()) is generated client-side by Prisma Client, so there is no
-- DB-level default to fall back on when inserting directly in SQL.
INSERT INTO "InterviewRound" ("id", "applicationId", "type", "mode", "scheduledAt", "status", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    "id",
    COALESCE("interviewRound", 'Unspecified round'),
    -- The old schema captured no mode at all; this is a stated default, not
    -- a reconstruction of something that was actually recorded.
    'VIDEO',
    -- scheduledAt is NOT NULL, so rows that only ever had a round name need
    -- some timestamp; the row's own updatedAt is the closest thing to when
    -- that interview information was last touched.
    COALESCE("interviewAt", "updatedAt"),
    -- The old field documented itself as "next scheduled interview", so a
    -- date already in the past is the best available signal it happened.
    CASE
        WHEN "interviewAt" IS NOT NULL AND "interviewAt" < NOW() THEN 'COMPLETED'::"InterviewRoundStatus"
        ELSE 'SCHEDULED'::"InterviewRoundStatus"
    END,
    "createdAt",
    "updatedAt"
FROM "Application"
WHERE "interviewRound" IS NOT NULL OR "interviewAt" IS NOT NULL;

-- AlterTable — last, so the backfill above can still read these.
ALTER TABLE "Application" DROP COLUMN "interviewAt",
DROP COLUMN "interviewRound";
