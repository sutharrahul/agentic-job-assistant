"use client";

import { useCallback, useEffect, useState } from "react";
import { Resume } from "@/lib/types/resume";
import { latestResume, listResumes } from "@/lib/api/resumes";
import { ResumeUploadForm } from "@/components/resume/resume-upload-form";
import { ResumePreviewForm } from "@/components/resume/resume-preview-form";
import { Button } from "@/components/ui/button";

export default function ResumePage() {
  const [resume, setResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReplacing, setIsReplacing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // Without this, a confirmed resume "disappears" on every refresh —
  // GET /resumes already existed on the backend, nothing here ever
  // called it, so the page always started from the upload form.
  //
  // The failure has to be tracked, not swallowed. "Couldn't load" and
  // "you have no resume yet" render completely differently, and the old
  // empty catch collapsed them into the second one — so a backend that
  // was merely asleep showed a returning user the upload form, which
  // reads as "my saved resume is gone". On a free tier that isn't an
  // edge case; it's what the first request after an idle period does.
  const load = useCallback(() => {
    setIsLoading(true);
    setLoadFailed(false);
    listResumes()
      .then((resumes) => setResume(latestResume(resumes)))
      .catch(() => setLoadFailed(true))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // A FAILED resume is still a resume, so gating the upload form on
  // `!resume` alone left the "try uploading it again" hint pointing at a
  // form that never rendered — the same reason there was no way to swap
  // in a different resume once one was saved.
  const showUploadForm = !resume || resume.status === "FAILED" || isReplacing;

  // Narrowed to a value rather than a boolean so TypeScript knows the
  // resume is non-null where the preview form needs it.
  const previewResume =
    !isReplacing &&
    resume &&
    (resume.status === "PARSED" || resume.status === "CONFIRMED")
      ? resume
      : null;

  function handleUploaded(next: Resume) {
    setResume(next);
    setIsReplacing(false);
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-semibold">Resume</h1>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Deliberately returns instead of rendering the upload form alongside:
  // we don't know whether a resume exists, so offering to replace one is
  // a guess, and guessing wrong is exactly the failure this avoids.
  if (loadFailed) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-semibold">Resume</h1>
        <p className="text-sm text-destructive">
          We couldn&apos;t load your resume. The server may still be waking
          up — this can take up to a minute on the free tier.
        </p>
        <Button variant="outline" onClick={load}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold">Resume</h1>

      {resume?.status === "FAILED" && (
        <p className="text-sm text-destructive">
          We couldn&apos;t parse that resume. Try uploading it again.
        </p>
      )}

      {showUploadForm && <ResumeUploadForm onUploaded={handleUploaded} />}

      {isReplacing && (
        <Button variant="ghost" onClick={() => setIsReplacing(false)}>
          Cancel
        </Button>
      )}

      {/* PROCESSING is normally transient — parsing happens inside the
          upload request. It's only reachable if the backend died
          mid-parse, which otherwise rendered a blank page. */}
      {!isReplacing && resume?.status === "PROCESSING" && (
        <p className="text-sm text-muted-foreground">
          Still processing this resume. Refresh in a moment.
        </p>
      )}

      {previewResume && (
        <ResumePreviewForm resume={previewResume} onConfirmed={setResume} />
      )}

      {!isReplacing && resume?.status === "CONFIRMED" && (
        <p className="text-sm text-muted-foreground">
          Saved as your base resume.
        </p>
      )}

      {previewResume && (
        <Button variant="outline" onClick={() => setIsReplacing(true)}>
          Upload a different resume
        </Button>
      )}
    </div>
  );
}
