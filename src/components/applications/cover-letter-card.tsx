"use client";

import { useState } from "react";
import { Check, PenLine, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Application, CoverLetterTone } from "@/lib/types/application";
import { generateCoverLetter, updateApplication } from "@/lib/api/applications";

const TONES: { value: CoverLetterTone; label: string }[] = [
  { value: "FORMAL", label: "Formal" },
  { value: "CONVERSATIONAL", label: "Conversational" },
  { value: "CONCISE", label: "Concise" },
];

export function CoverLetterCard({
  app,
  onUpdated,
}: {
  app: Application;
  onUpdated: (app: Application) => void;
}) {
  const [tone, setTone] = useState<CoverLetterTone>(
    app.coverLetterTone ?? "FORMAL",
  );
  // Edits live in local state until Approve — one PATCH with the final
  // text beats a network call per keystroke, and matches the HITL idea:
  // nothing is "real" until the user approves it.
  const [content, setContent] = useState(app.coverLetter ?? "");
  const [hasLocalEdits, setHasLocalEdits] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approved = app.coverLetterApproved && !hasLocalEdits;

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const updated = await generateCoverLetter(app.id, tone);
      onUpdated(updated);
      setContent(updated.coverLetter ?? "");
      setHasLocalEdits(false);
    } catch {
      setError("Generation failed — is the AI service running?");
    } finally {
      setIsGenerating(false);
    }
  }

  // The human-in-the-loop step: approving saves the (possibly edited)
  // text AND flips the approved flag in one PATCH.
  async function handleApprove() {
    setIsSaving(true);
    setError(null);
    try {
      onUpdated(
        await updateApplication(app.id, {
          coverLetter: content,
          coverLetterTone: tone,
          coverLetterApproved: true,
        }),
      );
      setHasLocalEdits(false);
    } catch {
      setError("Couldn't save — please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle>Cover letter</CardTitle>
        {approved && (
          <Badge variant="secondary">
            <Check data-icon="inline-start" />
            Approved
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Tone:</span>
          {TONES.map(({ value, label }) => (
            <Button
              key={value}
              size="sm"
              variant={tone === value ? "secondary" : "outline"}
              onClick={() => setTone(value)}
              disabled={isGenerating}
            >
              {label}
            </Button>
          ))}
        </div>

        {!content && !isGenerating && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <PenLine className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Generate a tailored cover letter for this role. You can edit it
              before approving.
            </p>
            <Button onClick={handleGenerate}>Generate cover letter</Button>
          </div>
        )}

        {isGenerating && !content && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Writing your letter with the local model...
          </p>
        )}

        {content && (
          <>
            <Textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                // Any manual edit invalidates a previous approval until
                // the user approves again.
                setHasLocalEdits(true);
              }}
              rows={12}
              className="min-h-56 font-mono text-sm"
              disabled={isGenerating}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={handleApprove}
                disabled={isGenerating || isSaving || approved}
              >
                <Check data-icon="inline-start" />
                {approved ? "Approved" : isSaving ? "Saving..." : "Approve letter"}
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <RefreshCw data-icon="inline-start" />
                {isGenerating ? "Generating..." : "Regenerate"}
              </Button>
            </div>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
