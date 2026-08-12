import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { ApplicationStatus } from '../../../generated/prisma';

export const COVER_LETTER_TONES = [
  'FORMAL',
  'CONVERSATIONAL',
  'CONCISE',
] as const;
export type CoverLetterTone = (typeof COVER_LETTER_TONES)[number];

// One PATCH DTO for everything the user can change directly (status via
// kanban drag or the dropdown, cover letter edits/approval). All fields
// optional — the global ValidationPipe's whitelist strips anything else.
// Notes are no longer part of this DTO — see AddNoteDto and the
// dedicated /notes endpoints below.
export class UpdateApplicationDto {
  // @IsEnum against the real Prisma enum closes the "status: banana"
  // gap called out in WALKTHROUGH.md — invalid values are now a clean
  // 400 from the pipe instead of a raw Prisma error at the DB.
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @IsString()
  coverLetter?: string;

  @IsOptional()
  @IsIn(COVER_LETTER_TONES)
  coverLetterTone?: CoverLetterTone;

  @IsOptional()
  @IsBoolean()
  coverLetterApproved?: boolean;

  // The user's per-study-topic progress, keyed "<category>::<topic>" — see
  // the note on Application.studyProgress in schema.prisma for why it is its
  // own column and not part of interviewPrep. The client PATCHes the WHOLE
  // map (it's one short string per topic), so this replaces rather than
  // merges. Validated only as an object: the keys are topic names the AI
  // invented, so there is no fixed key set to check them against.
  @IsOptional()
  @IsObject()
  studyProgress?: Record<string, string>;

  // --- Status-specific details ---------------------------------------
  // The date fields accept "" as "clear this value" (the frontend sends
  // that when the user empties the input) — ValidateIf skips the ISO
  // check for empty strings, and the service maps "" to null.

  @IsOptional()
  @IsString()
  appliedVia?: string;

  @IsOptional()
  @IsString()
  offeredCtc?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsDateString()
  joiningDate?: string;

  @IsOptional()
  @IsString()
  rejectionStage?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class GenerateCoverLetterDto {
  @IsIn(COVER_LETTER_TONES)
  tone: CoverLetterTone;
}

// The body is optional in practice — an absent one means "generate only if
// there's nothing stored yet", which is what every automatic caller wants.
// Only the Regenerate button sends { regenerate: true }, and it is the only
// thing that can make an application pay for a second prep generation.
export class GenerateInterviewPrepDto {
  @IsOptional()
  @IsBoolean()
  regenerate?: boolean;
}

export class AddNoteDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}
