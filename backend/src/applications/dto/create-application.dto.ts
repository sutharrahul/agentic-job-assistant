import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  company: string;

  @IsString()
  @IsNotEmpty()
  jobTitle: string;

  @IsString()
  @IsNotEmpty()
  jobDescription: string;

  @IsOptional()
  @IsString()
  location?: string;

  // Arrives as "YYYY-MM-DD" from the frontend's <input type="date">;
  // converted to a real Date in the service (Prisma wants DateTime).
  @IsOptional()
  @IsDateString()
  deadline?: string;
}
