import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  InterviewRoundResult,
  InterviewRoundStatus,
} from '../../../generated/prisma';

export class CreateInterviewRoundDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  // Open text like `type`, not a fixed list: the UI offers Online /
  // In-person / Phone plus a Custom option, and whatever the user types
  // there is stored verbatim.
  @IsString()
  @IsNotEmpty()
  mode: string;

  // Optional because the service assigns the next number automatically
  // when it's absent; accepted here so the user can override it.
  @IsOptional()
  @IsInt()
  @Min(1)
  roundNumber?: number;

  // Unlike the debrief/follow-up dates below, this column is NOT NULL —
  // no ValidateIf("" -> skip) here, so an empty string still fails
  // @IsDateString with a clean 400 instead of reaching Prisma as
  // `new Date("")` (Invalid Date -> a raw 500).
  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  interviewer?: string;

  // Present on create as well as update so a round that already happened
  // can be logged in one shot instead of create-then-PATCH.
  @IsOptional()
  @IsEnum(InterviewRoundResult)
  result?: InterviewRoundResult;

  @IsOptional()
  @IsString()
  interviewerFeedback?: string;

  @IsOptional()
  @IsString()
  personalNotes?: string;
}

export class UpdateInterviewRoundDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  mode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  roundNumber?: number;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  interviewer?: string;

  @IsOptional()
  @IsEnum(InterviewRoundStatus)
  status?: InterviewRoundStatus;

  @IsOptional()
  @IsEnum(InterviewRoundResult)
  result?: InterviewRoundResult;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  selfRating?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  questionsAsked?: string[];

  @IsOptional()
  @IsString()
  interviewerFeedback?: string;

  @IsOptional()
  @IsString()
  personalNotes?: string;

  @IsOptional()
  @IsBoolean()
  thankYouNoteSent?: boolean;

  // Nullable column, so "" (the frontend clearing the input) is valid —
  // same convention as Application's date fields.
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsDateString()
  expectedResponseBy?: string;
}
