-- AlterTable
ALTER TABLE "Application" DROP COLUMN "notes",
ADD COLUMN     "notes" JSONB NOT NULL DEFAULT '[]';

