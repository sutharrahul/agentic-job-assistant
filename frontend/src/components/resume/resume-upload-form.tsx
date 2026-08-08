"use client";

import { useState, type ChangeEvent } from "react";
import { AxiosError } from "axios";
import { api } from "@/lib/axios";
import { Resume } from "@/lib/types/resume";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function ResumeUploadForm({
  onUploaded,
}: {
  onUploaded: (resume: Resume) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    if (selected && !ACCEPTED_TYPES.includes(selected.type)) {
      setError("Only PDF and DOCX files are supported");
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
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        <p className="text-sm text-muted-foreground">
          PDF or DOCX, up to 5MB. We&apos;ll extract your skills, experience,
          education, and projects automatically.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={handleUpload} disabled={!file || isUploading}>
        {isUploading ? "Uploading & parsing..." : "Upload resume"}
      </Button>
    </div>
  );
}
