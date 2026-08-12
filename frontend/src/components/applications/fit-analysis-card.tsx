"use client";

import { useState } from "react";
import { Check, Gauge, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Application } from "@/lib/types/application";
import { analyzeFit } from "@/lib/api/applications";

// There's no real "AI confidence" field from the backend — fabricating one
// would misrepresent the analysis. This is a plain, deterministic label
// derived from the fit score itself; thresholds are an arbitrary but
// reasonable split, not a backend-sourced value.
function confidenceLabel(score: number) {
  if (score >= 80) return "High";
  if (score >= 50) return "Medium";
  return "Low";
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
  // "Good fit" is a separate, stronger signal than "Reviewed" (which only
  // means an analysis has run at all) — 70 is an arbitrary but reasonable
  // pass mark, not a threshold the backend defines.
  const isGoodFit = app.fitScore !== null && app.fitScore >= 70;
  // Suggestions map 1:1 onto missing skills when the counts line up;
  // otherwise there's no reliable pairing, so they're shown as one list.
  const suggestionsMatchSkills =
    analysis !== null &&
    analysis !== undefined &&
    analysis.suggestions.length === analysis.missingSkills.length;

  return (
    <Card className="rounded-2xl shadow-card">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle>Fit overview</CardTitle>
        <div className="flex items-center gap-1.5">
          {analysis && <Badge variant="warm">Reviewed</Badge>}
          {isGoodFit && <Badge variant="warm">Good fit</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!analysis && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Gauge className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Compare your resume against this job description.
            </p>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="bg-purple text-white hover:bg-purple-dark"
            >
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
            {/* Big-number + bar in place of the old score ring — matches
                the reference's flatter, more scannable score treatment. */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                <span className="font-heading text-5xl font-bold tracking-tight">
                  {Math.round(app.fitScore)}
                </span>
                <span className="text-lg font-medium text-muted-foreground">
                  /100
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-purple transition-[width] duration-700"
                  style={{ width: `${Math.round(app.fitScore)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 border-y py-4 text-center">
              <div>
                <p className="font-heading text-xl font-semibold">
                  {analysis.matchedSkills.length}
                </p>
                <p className="text-xs text-muted-foreground">Matched</p>
              </div>
              <div>
                <p className="font-heading text-xl font-semibold">
                  {analysis.missingSkills.length}
                </p>
                <p className="text-xs text-muted-foreground">To explore</p>
              </div>
              <div>
                <p className="font-heading text-xl font-semibold">
                  {confidenceLabel(app.fitScore)}
                </p>
                <p className="text-xs text-muted-foreground">Confidence</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Strong matches
              </p>
              <div className="flex flex-wrap gap-1.5">
                {analysis.matchedSkills.map((skill) => (
                  <Badge key={skill} variant="warm">
                    <Check data-icon="inline-start" />
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Worth making visible
              </p>
              <div className="space-y-1.5">
                {analysis.missingSkills.map((skill, index) => (
                  <div key={skill} className="rounded-lg border px-3 py-2">
                    <p className="text-sm font-medium">{skill}</p>
                    {suggestionsMatchSkills && (
                      <p className="mt-2 flex gap-2 text-sm text-muted-foreground">
                        <Lightbulb className="mt-0.5 size-4 shrink-0" />
                        <span>{analysis.suggestions[index]}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {!suggestionsMatchSkills && analysis.suggestions.length > 0 && (
                <div className="rounded-lg border px-3 py-2">
                  <p className="text-sm font-medium">Suggestions</p>
                  <ul className="mt-2 space-y-2">
                    {analysis.suggestions.map((suggestion) => (
                      <li
                        key={suggestion}
                        className="flex gap-2 text-sm text-muted-foreground"
                      >
                        <Lightbulb className="mt-0.5 size-4 shrink-0" />
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
