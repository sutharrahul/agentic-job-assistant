// Typed wrappers around the NestJS /applications endpoints — the real
// replacement for the old mock store (lib/mock/applications.ts, now
// deleted). Components import these instead of touching `api` directly
// so the endpoint paths live in exactly one place.

import { api } from "@/lib/axios";
import {
  Application,
  ApplicationStatus,
  CoverLetterTone,
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
  notes?: string;
  coverLetter?: string;
  coverLetterTone?: CoverLetterTone;
  coverLetterApproved?: boolean;
  // Status-specific details. Date fields take ISO strings; "" clears.
  appliedVia?: string;
  interviewRound?: string;
  interviewAt?: string;
  offeredCtc?: string;
  joiningDate?: string;
  rejectionStage?: string;
  rejectionReason?: string;
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

export async function generateInterviewPrep(id: string): Promise<Application> {
  const { data } = await api.post<Application>(
    `/applications/${id}/interview-prep`,
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
