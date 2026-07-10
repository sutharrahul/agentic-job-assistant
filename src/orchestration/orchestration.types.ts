// Hand-mirrored from ai-service's Pydantic schemas (ai-service/app/schemas/).
// There's no shared codegen between the two services (different
// languages), so these two definitions have to be kept in sync by hand
// when ai-service's response shapes change.

export interface ExperienceEntry {
  title: string;
  company: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

export interface EducationEntry {
  degree: string;
  institution: string;
  start_date?: string;
  end_date?: string;
}

export interface ProjectEntry {
  name: string;
  description?: string;
  technologies: string[];
}

export interface ParsedResumeData {
  summary?: string;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  projects: ProjectEntry[];
}

export interface ParseResumeResponse {
  parsed: ParsedResumeData;
}
