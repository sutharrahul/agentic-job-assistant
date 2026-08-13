// Typed wrappers around the NestJS /resumes endpoints — same pattern as
// lib/api/applications.ts, so components never call `api` directly for
// resume reads and the endpoint paths live in exactly one place.

import { api } from "@/lib/axios";
import { Resume } from "@/lib/types/resume";

export async function listResumes(): Promise<Resume[]> {
  const { data } = await api.get<Resume[]>("/resumes");
  return data;
}

// Newest upload wins — mirrors ApplicationsService.getConfirmedResume's
// `orderBy: updatedAt desc` pick on the backend, so the page that opens
// on load shows the same resume the AI actions would grade against.
export function latestResume(resumes: Resume[]): Resume | null {
  if (resumes.length === 0) return null;
  return [...resumes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0];
}
