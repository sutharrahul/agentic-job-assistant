"use client";

import { useEffect, useState } from "react";
import { Resume } from "@/lib/types/resume";
import { latestResume, listResumes } from "@/lib/api/resumes";
import { ResumeUploadForm } from "@/components/resume/resume-upload-form";
import { ResumePreviewForm } from "@/components/resume/resume-preview-form";

export default function ResumePage() {
  const [resume, setResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Without this, a confirmed resume "disappears" on every refresh —
  // GET /resumes already existed on the backend, nothing here ever
  // called it, so the page always started from the upload form.
  useEffect(() => {
    listResumes()
      .then((resumes) => setResume(latestResume(resumes)))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-semibold">Resume</h1>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold">Resume</h1>

      {!resume && <ResumeUploadForm onUploaded={setResume} />}

      {resume && resume.status === "FAILED" && (
        <p className="text-sm text-destructive">
          We couldn&apos;t parse that resume. Try uploading it again.
        </p>
      )}

      {resume && (resume.status === "PARSED" || resume.status === "CONFIRMED") && (
        <ResumePreviewForm resume={resume} onConfirmed={setResume} />
      )}

      {resume?.status === "CONFIRMED" && (
        <p className="text-sm text-muted-foreground">
          Saved as your base resume.
        </p>
      )}
    </div>
  );
}
