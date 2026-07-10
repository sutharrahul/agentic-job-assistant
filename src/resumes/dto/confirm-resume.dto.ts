import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

// Mirrors ai-service's ParsedResumeData (ai-service/app/schemas/resume.py)
// field-for-field, INCLUDING snake_case property names (start_date, not
// startDate). That's a deliberate deviation from normal TS camelCase
// convention: this DTO describes JSON crossing a service boundary, not
// an in-language object, and Pydantic serializes Python model fields as
// snake_case. Keeping the casing identical means the same JSON blob
// flows FastAPI -> NestJS -> Postgres -> Next.js unchanged, with no
// snake_case/camelCase conversion step (and no risk of a typo in that
// conversion silently dropping a field).
class ExperienceEntryDto {
  @IsString()
  title: string;

  @IsString()
  company: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class EducationEntryDto {
  @IsString()
  degree: string;

  @IsString()
  institution: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;
}

class ProjectEntryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  technologies: string[];
}

export class ConfirmResumeDto {
  @IsOptional()
  @IsString()
  summary?: string;

  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceEntryDto)
  experience: ExperienceEntryDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationEntryDto)
  education: EducationEntryDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectEntryDto)
  projects: ProjectEntryDto[];
}
