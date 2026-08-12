-- Two unrelated-looking changes in one migration because they landed in one
-- schema edit: the new Application.studyProgress column, and the removal of
-- the two redundant InterviewRound reflection columns.
--
-- studyProgress is its OWN column rather than a field inside interviewPrep
-- because interviewPrep is AI-generated and rewritten wholesale on
-- Regenerate — user progress stored in there would be wiped every time.
-- NOT NULL DEFAULT '{}' so existing rows and new ones both read back as an
-- empty map instead of null, and the API never has to special-case it.
--
-- The drop below is destructive, and unlike 20260812173000 it needs NO
-- backfill and NO hand-reordering: whatWentWell/whatToImprove overlapped
-- personalNotes and held data in zero rows on the database this was written
-- against (verified with a COUNT before generating this file), so there is
-- nothing to concatenate forward. selfRating, interviewerFeedback and
-- personalNotes are kept — a 1–5 score and "what the interviewer said" are
-- not redundant with the candidate's own notes.

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "studyProgress" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "InterviewRound" DROP COLUMN "whatToImprove",
DROP COLUMN "whatWentWell";
