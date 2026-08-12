"use client";

import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  GraduationCap,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Application,
  FocusArea,
  PrepQuestion,
  StudyPriority,
  StudyProgress,
  StudyTopic,
} from "@/lib/types/application";
import {
  generateInterviewPrep,
  updateApplication,
} from "@/lib/api/applications";
import { cn } from "@/lib/utils";

// Talking points come straight from the LLM, which sometimes wraps a
// word in **markdown bold**. This app has no markdown renderer, so those
// asterisks showed up literally — this handles just that one pattern
// rather than pulling in a full markdown library for it.
function renderBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}

const PRIORITY_RANK: Record<StudyPriority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const PRIORITY_LABEL: Record<StudyPriority, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

function PriorityBadge({ priority }: { priority: StudyPriority }) {
  // Only HIGH gets the coral treatment — if everything shouts, the
  // prioritisation the AI just did is wasted.
  return (
    <Badge variant={priority === "HIGH" ? "warm" : "secondary"}>
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}

function relativeDay(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

const PROGRESS_LABELS: Record<StudyProgress, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Studied",
};

// `${category}::${topic}` — topics have no id, and a bare topic name can
// repeat across categories.
function progressKey(topic: StudyTopic) {
  return `${topic.category}::${topic.topic}`;
}

type Group = { category: string; topics: StudyTopic[]; priority: StudyPriority };

function groupByCategory(topics: StudyTopic[]): Group[] {
  const byCategory = new Map<string, StudyTopic[]>();
  for (const topic of topics) {
    const existing = byCategory.get(topic.category);
    if (existing) existing.push(topic);
    else byCategory.set(topic.category, [topic]);
  }
  return [...byCategory.entries()]
    .map(([category, grouped]) => ({
      category,
      topics: grouped,
      priority: grouped.reduce<StudyPriority>(
        (top, t) => (PRIORITY_RANK[t.priority] > PRIORITY_RANK[top] ? t.priority : top),
        "LOW",
      ),
    }))
    .sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
}

function FocusAreas({ areas }: { areas: FocusArea[] }) {
  return (
    <div className="space-y-2">
      {areas.map((area) => (
        <div
          key={area.area}
          className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm"
        >
          <span className="font-semibold">{area.area}</span>
          <PriorityBadge priority={area.priority} />
          <span className="min-w-0 flex-1 text-muted-foreground">
            {area.why}
          </span>
        </div>
      ))}
    </div>
  );
}

// A DropdownMenu rather than three toggles per row: with a dozen topics,
// repeating a three-button segmented control on every line drowns the
// topics themselves. Same picker shape as the round status/result pickers.
function ProgressPicker({
  value,
  onChange,
}: {
  value: StudyProgress;
  onChange: (next: StudyProgress) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="xs"
            // Done is the one state worth spotting from across the list, so
            // it gets the coral treatment; the other two stay neutral.
            className={cn(
              value === "COMPLETED" &&
                "bg-purple-subtle text-purple-dark hover:bg-purple-subtle dark:bg-purple-subtle dark:text-purple-light dark:hover:bg-purple-subtle",
            )}
          />
        }
      >
        {PROGRESS_LABELS[value]}
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(PROGRESS_LABELS) as StudyProgress[]).map((state) => (
          <DropdownMenuItem key={state} onClick={() => onChange(state)}>
            {PROGRESS_LABELS[state]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StudyTopics({
  groups,
  progress,
  onProgressChange,
}: {
  groups: Group[];
  progress: Record<string, StudyProgress>;
  onProgressChange: (key: string, next: StudyProgress) => void;
}) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.category} className="space-y-2">
          <p className="font-heading text-base font-semibold">{group.category}</p>
          <ul className="space-y-1.5">
            {group.topics.map((topic) => {
              const key = progressKey(topic);
              const state = progress[key] ?? "NOT_STARTED";
              return (
                <li
                  key={topic.topic}
                  className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg border px-3 py-2 text-[0.925rem]"
                >
                  <span
                    className={cn(
                      "font-medium",
                      state === "COMPLETED" &&
                        "text-muted-foreground line-through",
                    )}
                  >
                    {topic.topic}
                  </span>
                  <PriorityBadge priority={topic.priority} />
                  <span className="font-label text-xs text-muted-foreground">
                    {topic.difficulty.toLowerCase()}
                  </span>
                  <div className="ml-auto">
                    <ProgressPicker
                      value={state}
                      onChange={(next) => onProgressChange(key, next)}
                    />
                  </div>
                  <span className="min-w-0 basis-full text-sm text-muted-foreground">
                    {topic.relevance}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ExperienceQuestions({ questions }: { questions: PrepQuestion[] }) {
  return (
    <ol className="space-y-4">
      {questions.map((q, index) => (
        <li key={q.question} className="space-y-2 rounded-lg border p-3 sm:p-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-base font-medium">
              {index + 1}. {q.question}
            </p>
          </div>
          {/* The resume item the AI had to cite to ask this — real context
              for the candidate, not debug output. */}
          {q.groundedIn && (
            <p className="font-label text-xs text-muted-foreground uppercase">
              {q.groundedIn}
            </p>
          )}
          <ul className="space-y-1.5">
            {q.talkingPoints.map((point) => (
              <li key={point} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-2.5 size-1 shrink-0 rounded-full bg-muted-foreground" />
                <span className="text-[0.925rem] leading-relaxed">
                  {renderBold(point)}
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

// The prep pack: what to STUDY (from the job) and what they'll ASK ABOUT
// YOUR EXPERIENCE (from the resume alone). Generated once per application
// and persisted — this component never generates on mount or on a stage
// change, only when the user clicks.
export function InterviewPrepCard({
  app,
  onUpdated,
}: {
  app: Application;
  onUpdated: (app: Application) => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(regenerate: boolean) {
    // Regenerating overwrites a saved pack and spends AI quota, so it asks
    // first — the same lightweight guard used for deletes in this app.
    if (
      regenerate &&
      !window.confirm("Replace this prep pack with a freshly generated one?")
    ) {
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      onUpdated(await generateInterviewPrep(app.id, regenerate));
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Generation failed — is the AI service running?";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleProgressChange(key: string, next: StudyProgress) {
    // Optimistic, like the status dropdown in application-detail.tsx —
    // ticking off a topic should feel instant, and a failed PATCH rolls
    // the whole map back rather than leaving the UI lying.
    const previous = app;
    const studyProgress = { ...app.studyProgress, [key]: next };
    onUpdated({ ...app, studyProgress });
    try {
      onUpdated(await updateApplication(app.id, { studyProgress }));
    } catch {
      onUpdated(previous);
      toast.error("Couldn't save your study progress — reverted.");
    }
  }

  const prep = app.interviewPrep;
  const groups = prep ? groupByCategory(prep.studyTopics) : [];
  // Packs and applications saved before these fields existed have neither.
  const focusAreas = prep?.focusAreas ?? [];
  const progress = app.studyProgress ?? {};
  const studiedCount =
    prep?.studyTopics.filter((t) => progress[progressKey(t)] === "COMPLETED")
      .length ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle>Interview preparation</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Prepare for this interview based on the job requirements and your
            experience.
          </p>
        </div>
        {prep && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGenerate(true)}
            disabled={isGenerating}
          >
            <RefreshCw data-icon="inline-start" />
            {isGenerating ? "Regenerating..." : "Regenerate"}
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-8">
        {!prep && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <GraduationCap className="size-6 text-muted-foreground" />
            <p className="max-w-md text-sm text-muted-foreground">
              Get a study plan for this role plus the questions an interviewer
              would ask about your own resume.
            </p>
            <Button onClick={() => handleGenerate(false)} disabled={isGenerating}>
              {isGenerating ? "Preparing..." : "Generate prep pack"}
            </Button>
            {isGenerating && (
              <p className="text-xs text-muted-foreground">
                Two-step pipeline (study plan, then questions) — takes up to a
                minute on the local model.
              </p>
            )}
          </div>
        )}

        {prep && (
          <>
            {focusAreas.length > 0 && (
              <section className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  The interview will likely focus on
                </p>
                <FocusAreas areas={focusAreas} />
              </section>
            )}

            {groups.length > 0 && (
              <section className="space-y-3">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold">
                  <BookOpen className="size-4 text-muted-foreground" />
                  Study before the interview
                  <span className="font-label text-xs font-normal text-muted-foreground">
                    {studiedCount} of {prep.studyTopics.length} studied
                  </span>
                </p>
                <StudyTopics
                  groups={groups}
                  progress={progress}
                  onProgressChange={handleProgressChange}
                />
              </section>
            )}

            {prep.questions.length > 0 && (
              <section className="space-y-3">
                <div>
                  <p className="flex items-center gap-2 text-base font-semibold">
                    <MessageSquare className="size-4 text-muted-foreground" />
                    Questions about your experience
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    These questions are based on your resume, projects, and
                    previous experience.
                  </p>
                </div>
                <ExperienceQuestions questions={prep.questions} />
              </section>
            )}

            {prep.generatedAt && (
              <p className="text-xs text-muted-foreground">
                Generated {relativeDay(prep.generatedAt)}.
              </p>
            )}
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
