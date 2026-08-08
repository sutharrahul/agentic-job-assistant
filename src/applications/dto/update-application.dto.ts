import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
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
// kanban drag or the dropdown, notes, cover letter edits/approval). All
// fields optional — the global ValidationPipe's whitelist strips
// anything else.
export class UpdateApplicationDto {
  // @IsEnum against the real Prisma enum closes the "status: banana"
  // gap called out in WALKTHROUGH.md — invalid values are now a clean
  // 400 from the pipe instead of a raw Prisma error at the DB.
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  coverLetter?: string;

  @IsOptional()
  @IsIn(COVER_LETTER_TONES)
  coverLetterTone?: CoverLetterTone;

  @IsOptional()
  @IsBoolean()
  coverLetterApproved?: boolean;

  // --- Status-specific details ---------------------------------------
  // The date fields accept "" as "clear this value" (the frontend sends
  // that when the user empties the input) — ValidateIf skips the ISO
  // check for empty strings, and the service maps "" to null.

  @IsOptional()
  @IsString()
  appliedVia?: string;

  @IsOptional()
  @IsString()
  interviewRound?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsDateString()
  interviewAt?: string;

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
