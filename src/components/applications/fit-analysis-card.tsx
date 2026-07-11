"use client";

import { useState } from "react";
import { Gauge, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Application } from "@/lib/types/application";
import { analyzeFit } from "@/lib/api/applications";

// SVG ring showing the 0–100 fit score. stroke-dasharray is the circle's
// circumference; dashoffset hides the un-scored fraction of it.
function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="relative size-28">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-secondary"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-primary transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">
        {Math.round(score)}%
      </span>
    </div>
  );
}

export function FitAnalysisCard({
  app,
  onUpdated,
}: {
  app: Application;
  onUpdated: (app: Application) => void;
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setIsAnalyzing(true);
    setError(null);
    try {
      onUpdated(await analyzeFit(app.id));
    } catch (err) {
      // The one expected failure worth a specific message: no confirmed
      // resume yet (backend returns 400 with that explanation).
      const message =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Analysis failed — is the AI service running?";
      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  const analysis = app.skillGapAnalysis;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fit analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!analysis && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Gauge className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Compare your resume against this job description.
            </p>
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? "Analyzing..." : "Run fit analysis"}
            </Button>
            {isAnalyzing && (
              <p className="text-xs text-muted-foreground">
                Running the local model — this can take a little while.
              </p>
            )}
          </div>
        )}

        {analysis && app.fitScore !== null && (
          <>
            <div className="flex justify-center">
              <ScoreRing score={app.fitScore} />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Matched skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.matchedSkills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Missing skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.missingSkills.map((skill) => (
                  <Badge key={skill} variant="destructive">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Suggestions
              </p>
              <ul className="space-y-2">
                {analysis.suggestions.map((suggestion) => (
                  <li key={suggestion} className="flex gap-2 text-sm">
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? "Re-analyzing..." : "Re-run analysis"}
            </Button>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
