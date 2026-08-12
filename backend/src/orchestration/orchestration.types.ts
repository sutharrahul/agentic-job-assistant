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

// The `parsed_job` every AI endpoint receives. Deliberately NOT
// pre-parsed by a separate LLM step: NestJS builds it straight from the
// Application row (company, jobTitle, jobDescription) so no extra AI
// round trip is needed before fit/cover-letter/prep calls.
export interface JobPayload {
  company: string;
  job_title: string;
  description: string;
}

export interface AnalyzeFitResponse {
  fit_score: number;
  matched_skills: string[];
  missing_skills: string[];
  suggestions: string[];
}

export interface GenerateCoverLetterResponse {
  cover_letter: string;
}

export interface StudyTopic {
  topic: string;
  category: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  relevance: string;
}

export interface PrepQuestion {
  question: string;
  // The resume/job line the question was drawn from — the whole point of
  // the prep pack is that every question is traceable to something real.
  grounded_in: string;
  talking_points: string[];
}

// The handful of themes to spend the remaining prep time on, as opposed to
// StudyTopic's per-subject checklist: fewer, broader, and each one carries
// its own justification.
export interface FocusArea {
  area: string;
  why: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface InterviewPrepResponse {
  study_topics: StudyTopic[];
  questions: PrepQuestion[];
  focus_areas: FocusArea[];
}
