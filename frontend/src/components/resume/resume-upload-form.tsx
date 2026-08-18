"use client";

import { useEffect, useId, useState, type ChangeEvent } from "react";
import { AxiosError } from "axios";
import { Upload } from "lucide-react";
import { api } from "@/lib/axios";
import { Resume } from "@/lib/types/resume";
import { Button } from "@/components/ui/button";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Mirrors the backend's MaxFileSizeValidator (resumes.controller.ts).
// Checked here too so an oversized file is rejected instantly instead of
// being uploaded in full and then bounced with a 413.
const MAX_FILE_BYTES = 5 * 1024 * 1024;

// After a failed upload, a cold AI service is still cold — retrying
// instantly just repeats the same failure. This blocks the button for a
// few seconds so a frustrated recruiter mashing "try again" doesn't turn
// one bad first impression into three.
const RETRY_COOLDOWN_SECONDS = 8;

export function ResumeUploadForm({
  onUploaded,
}: {
  onUploaded: (resume: Resume) => void;
}) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    if (selected && !ACCEPTED_TYPES.includes(selected.type)) {
      setError("Only PDF and DOCX files are supported");
      setFile(null);
      return;
    }
    if (selected && selected.size > MAX_FILE_BYTES) {
      setError("That file is larger than 5MB");
      setFile(null);
      return;
    }
    setError(null);
    setFile(selected);
  }

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post<Resume>("/resumes", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUploaded(data);
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err.response?.data?.message ?? "Upload failed")
          : "Upload failed";
      setError(message);
      setCooldown(RETRY_COOLDOWN_SECONDS);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <label
        htmlFor={inputId}
        className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center transition-colors hover:border-purple/50"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-purple-subtle text-purple-dark">
          <Upload className="size-5" />
        </span>
        <p className="text-sm text-foreground">
          Drop a new resume here, or{" "}
          <span className="font-medium text-purple underline underline-offset-2">
            choose a file
          </span>
        </p>
        <p className="text-xs text-muted-foreground">PDF or DOCX · up to 5MB</p>
        <input
          id={inputId}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileChange}
          disabled={isUploading}
          className="sr-only"
        />
      </label>
      {file && (
        <p className="text-sm text-muted-foreground">Selected: {file.name}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        onClick={handleUpload}
        disabled={!file || isUploading || cooldown > 0}
      >
        {isUploading
          ? "Uploading & parsing..."
          : cooldown > 0
            ? `Try again in ${cooldown}s`
            : "Upload resume"}
      </Button>
    </div>
  );
}
