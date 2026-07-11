// Mirrors the Application row NestJS returns (backend/prisma/schema.prisma)
// — camelCase field names, exactly as Prisma serializes them. Keep in
// sync with the schema when it changes.

export type ApplicationStatus = "APPLIED" | "INTERVIEW" | "OFFER" | "REJECTED";

export type CoverLetterTone = "FORMAL" | "CONVERSATIONAL" | "CONCISE";

export interface SkillGapAnalysis {
  matchedSkills: string[];
  missingSkills: string[];
  suggestions: string[];
}

export interface InterviewQuestion {
  question: string;
  talkingPoints: string[];
}

export interface InterviewPrep {
  focusAreas: string[];
  technicalQuestions: InterviewQuestion[];
  behavioralQuestions: InterviewQuestion[];
  gapsToPrepare: string[];
}

export interface Application {
  id: string;
  userId: string;
  resumeId: string | null;
  company: string;
  jobTitle: string;
  jobDescription: string;
  location: string | null;
  deadline: string | null; // ISO datetime
  notes: string;
  status: ApplicationStatus;
  fitScore: number | null;
  skillGapAnalysis: SkillGapAnalysis | null;
  coverLetter: string | null;
  coverLetterTone: CoverLetterTone | null;
  coverLetterApproved: boolean;
  interviewPrep: InterviewPrep | null;
  createdAt: string; // doubles as "applied at"
  updatedAt: string;
}
