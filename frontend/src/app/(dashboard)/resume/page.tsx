"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Resume } from "@/lib/types/resume";
import { latestResume, listResumes } from "@/lib/api/resumes";
import { ResumeUploadForm } from "@/components/resume/resume-upload-form";
import { ResumePreviewForm } from "@/components/resume/resume-preview-form";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/layout/page-heading";

export default function ResumePage() {
  const [resume, setResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReplacing, setIsReplacing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  // Bumped by the retry button to re-run the effect below.
  const [retryKey, setRetryKey] = useState(0);

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
  //
  // Every setState here happens inside a then/catch/finally callback,
  // never synchronously at the top of the effect body — isLoading starts
  // true via its initial state for the first run, and the retry button
  // sets it back to true itself before bumping retryKey. That split
  // matters: a setState called synchronously in an effect body (rather
  // than from an async callback) is exactly what triggers React's
  // set-state-in-effect lint rule.
  useEffect(() => {
    listResumes()
      .then((resumes) => {
        setResume(latestResume(resumes));
        setLoadFailed(false);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setIsLoading(false));
  }, [retryKey]);

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
      <div>
        <PageHeading crumbs={["Workspace", "Resume"]} title="Resume" />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Deliberately returns instead of rendering the upload form alongside:
  // we don't know whether a resume exists, so offering to replace one is
  // a guess, and guessing wrong is exactly the failure this avoids.
  if (loadFailed) {
    return (
      <div>
        <PageHeading crumbs={["Workspace", "Resume"]} title="Resume" />
        <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
          <p className="text-sm text-destructive">
            We couldn&apos;t load your resume. The server may still be waking
            up — this can take up to a minute on the free tier.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setIsLoading(true);
              setRetryKey((k) => k + 1);
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeading crumbs={["Workspace", "Resume"]} title="Resume" />

      {/* Two columns from lg: up — the file card is small and static, so
          pinning it to a narrow rail hands the rest of a wide screen to the
          resume itself instead of leaving margins. Matches the max-w-6xl
          the application detail page already uses. */}
      <div className="mx-auto grid max-w-6xl gap-6 p-4 sm:p-6 lg:grid-cols-[280px_1fr] lg:p-8">
        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {resume?.status === "FAILED" && (
            <p className="text-sm text-destructive">
              We couldn&apos;t parse that resume. Try uploading it again.
            </p>
          )}

          {previewResume && (
            <div className="space-y-3 rounded-2xl bg-card p-5 shadow-card">
              <span className="flex size-10 items-center justify-center rounded-xl bg-purple-subtle text-purple-dark">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-heading truncate font-semibold">
                  {previewResume.fileName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {previewResume.status === "CONFIRMED" ? "Confirmed" : "Parsed"}{" "}
                  ·{" "}
                  {new Date(previewResume.createdAt).toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric", year: "numeric" },
                  )}
                </p>
              </div>
              <Button variant="outline" onClick={() => setIsReplacing(true)}>
                Replace file
              </Button>
            </div>
          )}

        {showUploadForm && (
          <div className="space-y-3">
            <h2 className="font-heading text-base font-medium">
              Resume source
            </h2>
            <ResumeUploadForm onUploaded={handleUploaded} />
            {isReplacing && (
              <Button variant="ghost" onClick={() => setIsReplacing(false)}>
                Cancel
              </Button>
            )}
          </div>
        )}

        {/* PROCESSING is normally transient — parsing happens inside the
            upload request. It's only reachable if the backend died
            mid-parse, which otherwise rendered a blank page. */}
        {!isReplacing && resume?.status === "PROCESSING" && (
          <p className="text-sm text-muted-foreground">
            Still processing this resume. Refresh in a moment.
          </p>
        )}

          {!isReplacing && resume?.status === "CONFIRMED" && (
            <p className="text-sm text-muted-foreground">
              Saved as your base resume.
            </p>
          )}
        </div>

        <div className="min-w-0">
          {previewResume && (
            <ResumePreviewForm resume={previewResume} onConfirmed={setResume} />
          )}
        </div>
      </div>
    </div>
  );
}
