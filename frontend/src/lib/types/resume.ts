// Mirrors ai-service's ParsedResumeData (ai-service/app/schemas/resume.py)
// field-for-field, including snake_case keys — see the equivalent note
// in backend/src/resumes/dto/confirm-resume.dto.ts. Same JSON shape end
// to end, so no mapping/renaming step is needed anywhere in the chain.
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

export type ResumeStatus = "PROCESSING" | "PARSED" | "CONFIRMED" | "FAILED";

export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  storagePath: string;
  status: ResumeStatus;
  parsedData: ParsedResumeData | null;
  createdAt: string;
  updatedAt: string;
}
