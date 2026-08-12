// Typed wrappers around the NestJS /applications endpoints — the real
// replacement for the old mock store (lib/mock/applications.ts, now
// deleted). Components import these instead of touching `api` directly
// so the endpoint paths live in exactly one place.

import { api } from "@/lib/axios";
import {
  Application,
  ApplicationStatus,
  CoverLetterTone,
  InterviewRound,
  InterviewRoundResult,
  InterviewRoundStatus,
  StudyProgress,
} from "@/lib/types/application";

export interface CreateApplicationInput {
  company: string;
  jobTitle: string;
  jobDescription: string;
  location?: string;
  deadline?: string; // "YYYY-MM-DD" from <input type="date">
}

export interface UpdateApplicationInput {
  status?: ApplicationStatus;
  coverLetter?: string;
  coverLetterTone?: CoverLetterTone;
  coverLetterApproved?: boolean;
  // Whole map every time — it's small, and a partial patch would need a
  // merge endpoint the backend doesn't have.
  studyProgress?: Record<string, StudyProgress>;
  // Status-specific details. Date fields take ISO strings; "" clears.
  appliedVia?: string;
  offeredCtc?: string;
  joiningDate?: string;
  rejectionStage?: string;
  rejectionReason?: string;
}

export interface CreateInterviewRoundInput {
  type: string;
  mode: InterviewRound["mode"];
  scheduledAt: string; // ISO datetime
  interviewer?: string;
}

export interface UpdateInterviewRoundInput {
  type?: string;
  mode?: InterviewRound["mode"];
  roundNumber?: number;
  scheduledAt?: string; // ISO datetime
  interviewer?: string;
  status?: InterviewRoundStatus;
  result?: InterviewRoundResult | null;
  selfRating?: number | null; // null clears the rating
  questionsAsked?: string[];
  interviewerFeedback?: string;
  personalNotes?: string;
  thankYouNoteSent?: boolean;
  expectedResponseBy?: string; // ISO datetime; "" clears
}

export async function listApplications(): Promise<Application[]> {
  const { data } = await api.get<Application[]>("/applications");
  return data;
}

export async function getApplication(id: string): Promise<Application> {
  const { data } = await api.get<Application>(`/applications/${id}`);
  return data;
}

export async function createApplication(
  input: CreateApplicationInput,
): Promise<Application> {
  const { data } = await api.post<Application>("/applications", input);
  return data;
}

export async function updateApplication(
  id: string,
  patch: UpdateApplicationInput,
): Promise<Application> {
  const { data } = await api.patch<Application>(`/applications/${id}`, patch);
  return data;
}

export async function deleteApplication(id: string): Promise<void> {
  await api.delete(`/applications/${id}`);
}

// --- AI actions — slow calls (LLM inference), callers should show a
// --- loading state. Each returns the updated application row.

export async function analyzeFit(id: string): Promise<Application> {
  const { data } = await api.post<Application>(
    `/applications/${id}/analyze-fit`,
  );
  return data;
}

export async function generateCoverLetter(
  id: string,
  tone: CoverLetterTone,
): Promise<Application> {
  const { data } = await api.post<Application>(
    `/applications/${id}/cover-letter`,
    { tone },
  );
  return data;
}

// The backend generates ONCE and then returns the stored pack for free.
// Sending regenerate:true is the only thing that spends AI quota again —
// omitting the flag on a "Regenerate" click would silently no-op.
export async function generateInterviewPrep(
  id: string,
  regenerate = false,
): Promise<Application> {
  const { data } = await api.post<Application>(
    `/applications/${id}/interview-prep`,
    { regenerate },
  );
  return data;
}

// --- Notes -------------------------------------------------------------

export async function addNote(id: string, content: string): Promise<Application> {
  const { data } = await api.post<Application>(`/applications/${id}/notes`, { content });
  return data;
}

export async function deleteNote(id: string, noteId: string): Promise<Application> {
  const { data } = await api.delete<Application>(`/applications/${id}/notes/${noteId}`);
  return data;
}

// --- Interview rounds ---------------------------------------------------

export async function createInterviewRound(
  id: string,
  input: CreateInterviewRoundInput,
): Promise<Application> {
  const { data } = await api.post<Application>(
    `/applications/${id}/interview-rounds`,
    input,
  );
  return data;
}

export async function updateInterviewRound(
  id: string,
  roundId: string,
  patch: UpdateInterviewRoundInput,
): Promise<Application> {
  const { data } = await api.patch<Application>(
    `/applications/${id}/interview-rounds/${roundId}`,
    patch,
  );
  return data;
}

export async function deleteInterviewRound(
  id: string,
  roundId: string,
): Promise<Application> {
  const { data } = await api.delete<Application>(
    `/applications/${id}/interview-rounds/${roundId}`,
  );
  return data;
}

// --- Reminder logic (pure, client-side) ------------------------------

export const STALE_AFTER_DAYS = 7;

export function isStale(app: Application): boolean {
  if (app.status !== "APPLIED") return false;
  const applied = new Date(app.createdAt).getTime();
  const ageDays = (Date.now() - applied) / (1000 * 60 * 60 * 24);
  return ageDays > STALE_AFTER_DAYS;
}

// Soonest round still ahead of the candidate — the one worth surfacing as
// a reminder. Rounds arrive sorted by scheduledAt ascending, so the first
// qualifying one is also the soonest.
export function nextScheduledRound(app: Application): InterviewRound | null {
  const now = Date.now();
  return (
    app.interviewRounds.find(
      (round) =>
        round.status === "SCHEDULED" &&
        new Date(round.scheduledAt).getTime() > now,
    ) ?? null
  );
}

// A round that happened but has nothing recorded about it yet. Any single
// piece of debrief content (even just a rating) counts as "started" and
// stops the nag — this only flags rounds with literally nothing written.
export function hasUndebriefedRound(app: Application): boolean {
  return app.interviewRounds.some(
    (round) =>
      round.status === "COMPLETED" &&
      round.selfRating === null &&
      round.questionsAsked.length === 0 &&
      !round.interviewerFeedback &&
      !round.personalNotes,
  );
}
