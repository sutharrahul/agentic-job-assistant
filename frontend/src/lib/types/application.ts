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

export type StudyPriority = "HIGH" | "MEDIUM" | "LOW";
export type StudyDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

// Something to LEARN before the interview, derived from the job. Never a
// question — questions come only from the resume (see PrepQuestion).
export interface StudyTopic {
  topic: string;
  category: string; // umbrella, e.g. "JavaScript" for topic "Closures"
  priority: StudyPriority;
  difficulty: StudyDifficulty;
  relevance: string;
}

// What the interview will centre on. Comes from the AI directly — the
// study-topic categories are a study index, not the same thing.
export interface FocusArea {
  area: string;
  why: string;
  priority: StudyPriority;
}

export type StudyProgress = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export interface PrepQuestion {
  question: string;
  // The exact resume item this came from, e.g. "Project: chat.rahul".
  // The AI is required to cite it, which is what stops it inventing
  // experience — worth surfacing rather than hiding.
  groundedIn: string;
  talkingPoints: string[];
}

// Generated ONCE per application and persisted server-side; re-reading it
// costs nothing. Only an explicit Regenerate spends AI quota again.
export interface InterviewPrep {
  focusAreas: FocusArea[];
  studyTopics: StudyTopic[];
  questions: PrepQuestion[];
  generatedAt: string; // ISO datetime
}

export interface Note {
  id: string;
  content: string;
  createdAt: string; // ISO datetime
}

export type InterviewRoundStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

// Did the meeting happen (status) is separate from how it turned out
// (result) — a COMPLETED round can sit on WAITING for a week.
export type InterviewRoundResult = "PASSED" | "FAILED" | "WAITING";

export interface InterviewRound {
  id: string;
  applicationId: string;
  type: string; // free text — "Technical", "Bar raiser", anything
  mode: string; // free text too — Online / In-person / Phone / custom
  roundNumber: number | null;
  scheduledAt: string; // ISO datetime
  interviewer: string | null;
  status: InterviewRoundStatus;
  result: InterviewRoundResult | null;
  selfRating: number | null; // 1-5
  questionsAsked: string[];
  interviewerFeedback: string | null;
  personalNotes: string | null;
  thankYouNoteSent: boolean;
  expectedResponseBy: string | null; // ISO datetime
  createdAt: string;
  updatedAt: string;
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
  notes: Note[];
  status: ApplicationStatus;
  // Status-specific details — only the group matching `status` is
  // meaningful (see the schema comment in backend/prisma/schema.prisma).
  appliedVia: string | null;
  offeredCtc: string | null;
  joiningDate: string | null; // ISO datetime
  rejectionStage: string | null;
  rejectionReason: string | null;
  fitScore: number | null;
  skillGapAnalysis: SkillGapAnalysis | null;
  coverLetter: string | null;
  coverLetterTone: CoverLetterTone | null;
  coverLetterApproved: boolean;
  interviewPrep: InterviewPrep | null;
  // Keyed `${category}::${topic}`; a topic with no entry is NOT_STARTED.
  // Lives on the application, not inside interviewPrep, so regenerating
  // the pack doesn't wipe what's already been studied.
  studyProgress: Record<string, StudyProgress>;
  // Replaces the old single interviewRound/interviewAt pair, which could
  // only hold ONE round — interviewing is multi-round by nature.
  interviewRounds: InterviewRound[];
  createdAt: string; // doubles as "applied at"
  updatedAt: string;
}
