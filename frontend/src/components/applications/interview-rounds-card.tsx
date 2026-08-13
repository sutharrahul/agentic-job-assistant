"use client";

import { useState } from "react";
import { CalendarClock, ChevronDown, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Application,
  InterviewRound,
  InterviewRoundResult,
  InterviewRoundStatus,
} from "@/lib/types/application";
import {
  createInterviewRound,
  deleteInterviewRound,
  updateInterviewRound,
} from "@/lib/api/applications";
import { cn } from "@/lib/utils";

// Curated presets cover most real interview loops; "Custom…" is the
// escape hatch for the ones that don't (company-specific round names
// like "Bar raiser" are common, and the backend stores type as free
// text for exactly this reason). Plain string[], not `as const` — this
// is compared against `round.type: string` below, and a literal-tuple
// type would make `.includes()` reject that comparison.
const ROUND_TYPE_PRESETS: readonly string[] = [
  "Phone screen",
  "Technical",
  "System design",
  "Behavioral",
  "Case study",
  "Take-home review",
  "HR",
  "Managerial",
  "Final",
];

// Presets, not an enum — mode is free text on the backend (same as type),
// so a custom value must display verbatim rather than falling through a
// label map and rendering blank.
const MODE_PRESETS: readonly string[] = ["Online", "In-person", "Phone"];

const ROUND_STATUS_LABELS: Record<InterviewRoundStatus, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// Separate from status on purpose: status is whether the meeting happened,
// result is how it turned out. A COMPLETED round sits on WAITING until the
// company gets back to you.
const ROUND_RESULT_LABELS: Record<InterviewRoundResult, string> = {
  PASSED: "Passed",
  FAILED: "Failed",
  WAITING: "Waiting",
};

const ROUND_RESULT_BADGE_VARIANTS: Record<
  InterviewRoundResult,
  "warm" | "secondary" | "destructive"
> = {
  PASSED: "warm",
  FAILED: "destructive",
  WAITING: "secondary",
};

const ROUND_STATUS_BADGE_VARIANTS: Record<
  InterviewRoundStatus,
  "outline" | "secondary" | "destructive"
> = {
  SCHEDULED: "outline",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

// ISO from the API -> value an <input type="datetime-local"/"date"> can
// display. datetime-local wants LOCAL wall-clock time, so shift by the
// timezone offset before slicing (plain .slice on the UTC string would
// show the wrong hour). Copied from status-details-card.tsx rather than
// shared — that file no longer has a datetime-local field to need it.
function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function isoToDateInput(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Same "nothing recorded at all" check as hasUndebriefedRound in
// lib/api/applications.ts, at single-round granularity for the trigger's
// dot — kept inline since that helper operates on a whole Application.
function needsDebrief(round: InterviewRound): boolean {
  return (
    round.status === "COMPLETED" &&
    round.selfRating === null &&
    round.questionsAsked.length === 0 &&
    !round.interviewerFeedback &&
    !round.personalNotes
  );
}

// There's no <select> in this app — every picker below is a DropdownMenu
// styled to sit in a form (page-level status dropdown in
// application-detail.tsx is the structural reference).
function TypePicker({
  value,
  isCustom,
  onChange,
  onCustom,
}: {
  value: string;
  isCustom: boolean;
  onChange: (next: string) => void;
  onCustom: () => void;
}) {
  if (isCustom) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Round type"
      />
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className="w-full justify-between" />}
      >
        {value || "Select type"}
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {ROUND_TYPE_PRESETS.map((preset) => (
          <DropdownMenuItem key={preset} onClick={() => onChange(preset)}>
            {preset}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCustom}>Custom…</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ModePicker({
  value,
  isCustom,
  onChange,
  onCustom,
}: {
  value: string;
  isCustom: boolean;
  onChange: (next: string) => void;
  onCustom: () => void;
}) {
  if (isCustom) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Interview mode"
      />
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className="w-full justify-between" />}
      >
        {value || "Select mode"}
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {MODE_PRESETS.map((preset) => (
          <DropdownMenuItem key={preset} onClick={() => onChange(preset)}>
            {preset}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCustom}>Custom…</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Deliberately not TagInput: that renders chips, which suit short skill
// names but not interview questions — a real question is a sentence, and a
// row of sentence-length pills wraps into an unreadable block. A numbered
// list also matches how the prep pack lists its own questions.
function QuestionsAsked({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const q = draft.trim();
    if (q && !value.includes(q)) onChange([...value, q]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ol className="space-y-1.5">
          {value.map((q, index) => (
            <li
              key={q}
              className="flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <span className="font-label shrink-0 text-xs text-muted-foreground">
                {index + 1}.
              </span>
              <span className="min-w-0 flex-1 break-words">{q}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== q))}
                className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="size-3.5" />
                <span className="sr-only">Remove question</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={add}
        onKeyDown={(e) => {
          // Enter only — a comma is normal punctuation inside a question,
          // unlike in the tag input this replaced.
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        placeholder="Type a question and press Enter"
      />
    </div>
  );
}

function ResultPicker({
  value,
  onChange,
}: {
  value: InterviewRoundResult | null;
  onChange: (next: InterviewRoundResult | null) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        {value ? ROUND_RESULT_LABELS[value] : "No result yet"}
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {(Object.keys(ROUND_RESULT_LABELS) as InterviewRoundResult[]).map(
          (result) => (
            <DropdownMenuItem key={result} onClick={() => onChange(result)}>
              {ROUND_RESULT_LABELS[result]}
            </DropdownMenuItem>
          ),
        )}
        <DropdownMenuItem onClick={() => onChange(null)}>
          Clear
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatusPicker({
  value,
  onChange,
}: {
  value: InterviewRoundStatus;
  onChange: (next: InterviewRoundStatus) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        {ROUND_STATUS_LABELS[value]}
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {(Object.keys(ROUND_STATUS_LABELS) as InterviewRoundStatus[]).map(
          (status) => (
            <DropdownMenuItem key={status} onClick={() => onChange(status)}>
              {ROUND_STATUS_LABELS[status]}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Numbered toggles, same active/inactive visual language as the
// PrepChecklist toggle in interview-prep-card.tsx. Re-clicking the
// selected value clears it — a rating is optional, not a required scale.
function SelfRatingPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          className={cn(
            "flex size-7 items-center justify-center rounded-md border text-sm font-medium transition-colors",
            value === n
              ? "border-purple bg-purple text-white"
              : "border-border text-muted-foreground hover:border-purple",
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// Self-contained (owns its own open + draft state) so it can be mounted
// independently in both the header (once rounds exist) and the empty
// state (before any do) — the two are never mounted at the same time,
// so there's no state to share between them.
function AddRoundDialog({
  appId,
  onUpdated,
  triggerVariant,
}: {
  appId: string;
  onUpdated: (app: Application) => void;
  triggerVariant: "outline" | "default";
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(ROUND_TYPE_PRESETS[0]);
  const [isCustomType, setIsCustomType] = useState(false);
  const [mode, setMode] = useState(MODE_PRESETS[0]);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleCreate() {
    if (!scheduledAt) return;
    setIsSaving(true);
    try {
      onUpdated(
        await createInterviewRound(appId, {
          type,
          mode,
          scheduledAt,
          interviewer: interviewer.trim(),
        }),
      );
      setOpen(false);
      setType(ROUND_TYPE_PRESETS[0]);
      setIsCustomType(false);
      setMode(MODE_PRESETS[0]);
      setIsCustomMode(false);
      setScheduledAt("");
      setInterviewer("");
    } catch {
      toast.error("Couldn't add the round — please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={triggerVariant} size="sm" />}>
        <Plus data-icon="inline-start" />
        Add round
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add interview round</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Type</Label>
            <TypePicker
              value={type}
              isCustom={isCustomType}
              onChange={setType}
              onCustom={() => {
                setIsCustomType(true);
                setType("");
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Mode</Label>
            <ModePicker
              value={mode}
              isCustom={isCustomMode}
              onChange={setMode}
              onCustom={() => {
                setIsCustomMode(true);
                setMode("");
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-round-scheduled-at">Scheduled for</Label>
            <Input
              id="new-round-scheduled-at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-round-interviewer">Interviewer</Label>
            <Input
              id="new-round-interviewer"
              placeholder="Optional"
              value={interviewer}
              onChange={(e) => setInterviewer(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleCreate} disabled={isSaving || !scheduledAt}>
            {isSaving ? "Adding..." : "Add round"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// The accordion content: one round's full editor. Seeded once from
// `round`, not re-synced on every prop change — this instance is the
// sole editor for this one round (status quick-change and Save both
// live here and both flow back through the same onUpdated), so nothing
// external ever needs to overwrite an in-progress draft underneath it.
function RoundEditor({
  app,
  round,
  onUpdated,
}: {
  app: Application;
  round: InterviewRound;
  onUpdated: (app: Application) => void;
}) {
  const [type, setType] = useState(round.type);
  const [isCustomType, setIsCustomType] = useState(
    () => !ROUND_TYPE_PRESETS.includes(round.type),
  );
  const [mode, setMode] = useState(round.mode);
  // A stored mode that matches no preset is a custom one — show the text
  // input, not a dropdown that cannot represent it.
  const [isCustomMode, setIsCustomMode] = useState(
    () => !MODE_PRESETS.includes(round.mode),
  );
  const [scheduledAt, setScheduledAt] = useState(() =>
    isoToDatetimeLocal(round.scheduledAt),
  );
  const [interviewer, setInterviewer] = useState(round.interviewer ?? "");
  const [selfRating, setSelfRating] = useState(round.selfRating);
  const [questionsAsked, setQuestionsAsked] = useState(round.questionsAsked);
  const [interviewerFeedback, setInterviewerFeedback] = useState(
    round.interviewerFeedback ?? "",
  );
  const [personalNotes, setPersonalNotes] = useState(round.personalNotes ?? "");
  const [result, setResult] = useState(round.result);
  const [thankYouNoteSent, setThankYouNoteSent] = useState(
    round.thankYouNoteSent,
  );
  const [expectedResponseBy, setExpectedResponseBy] = useState(() =>
    isoToDateInput(round.expectedResponseBy),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Deliberately NOT batched with Save below — "mark completed" (right
  // after the call) and "write the debrief" (later that evening) are
  // genuinely separate moments.
  async function handleStatusChange(status: InterviewRoundStatus) {
    try {
      onUpdated(await updateInterviewRound(app.id, round.id, { status }));
    } catch {
      toast.error("Couldn't update the round status — please try again.");
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      onUpdated(
        await updateInterviewRound(app.id, round.id, {
          type,
          mode,
          scheduledAt,
          interviewer,
          // Debrief/follow-up only exists once a round has actually
          // happened — sending it while SCHEDULED/CANCELLED would just
          // write empty drafts over nothing.
          ...(round.status === "COMPLETED" && {
            result,
            selfRating,
            questionsAsked,
            interviewerFeedback,
            personalNotes,
            thankYouNoteSent,
            expectedResponseBy,
          }),
        }),
      );
    } catch {
      toast.error("Couldn't save the round — please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete this ${round.type} round?`)) return;
    setIsDeleting(true);
    try {
      onUpdated(await deleteInterviewRound(app.id, round.id));
    } catch {
      toast.error("Couldn't delete the round — please try again.");
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <StatusPicker value={round.status} onChange={handleStatusChange} />
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash2 />
          <span className="sr-only">Delete round</span>
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Type</Label>
        <TypePicker
          value={type}
          isCustom={isCustomType}
          onChange={setType}
          onCustom={() => {
            setIsCustomType(true);
            setType("");
          }}
        />
      </div>
      <div className="space-y-2">
        <Label>Mode</Label>
        <ModePicker
          value={mode}
          isCustom={isCustomMode}
          onChange={setMode}
          onCustom={() => {
            setIsCustomMode(true);
            setMode("");
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`round-scheduled-${round.id}`}>Scheduled for</Label>
        <Input
          id={`round-scheduled-${round.id}`}
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`round-interviewer-${round.id}`}>Interviewer</Label>
        <Input
          id={`round-interviewer-${round.id}`}
          placeholder="Optional"
          value={interviewer}
          onChange={(e) => setInterviewer(e.target.value)}
        />
      </div>

      {round.status === "COMPLETED" && (
        <div className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label>Result</Label>
            <div>
              <ResultPicker value={result} onChange={setResult} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Self rating</Label>
            <SelfRatingPicker value={selfRating} onChange={setSelfRating} />
          </div>
          <div className="space-y-2">
            <Label>Questions they actually asked</Label>
            <QuestionsAsked
              value={questionsAsked}
              onChange={setQuestionsAsked}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`round-feedback-${round.id}`}>
              Interviewer feedback (what they told you)
            </Label>
            <Textarea
              id={`round-feedback-${round.id}`}
              rows={3}
              value={interviewerFeedback}
              onChange={(e) => setInterviewerFeedback(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`round-notes-${round.id}`}>Private notes</Label>
            <Textarea
              id={`round-notes-${round.id}`}
              rows={3}
              value={personalNotes}
              onChange={(e) => setPersonalNotes(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`round-thank-you-${round.id}`}
              checked={thankYouNoteSent}
              onCheckedChange={(checked) => setThankYouNoteSent(checked)}
            />
            <Label htmlFor={`round-thank-you-${round.id}`}>
              Thank-you note sent
            </Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`round-response-${round.id}`}>
              Expected response by
            </Label>
            <Input
              id={`round-response-${round.id}`}
              type="date"
              value={expectedResponseBy}
              onChange={(e) => setExpectedResponseBy(e.target.value)}
            />
          </div>
        </div>
      )}

      <Button size="sm" variant="outline" onClick={handleSave} disabled={isSaving}>
        {isSaving ? "Saving..." : "Save round"}
      </Button>
    </div>
  );
}

// Multi-round interview tracking — replaces the old single
// interviewRound/interviewAt pair, which could only hold one round and
// was overwritten by the next. Each round gets its own scheduling,
// status, and — once completed — debrief.
export function InterviewRoundsCard({
  app,
  onUpdated,
}: {
  app: Application;
  onUpdated: (app: Application) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle>Interview rounds</CardTitle>
        {app.interviewRounds.length > 0 && (
          <AddRoundDialog
            appId={app.id}
            onUpdated={onUpdated}
            triggerVariant="outline"
          />
        )}
      </CardHeader>
      <CardContent>
        {app.interviewRounds.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CalendarClock className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No interview rounds yet — add one to start tracking.
            </p>
            <AddRoundDialog
              appId={app.id}
              onUpdated={onUpdated}
              triggerVariant="default"
            />
          </div>
        ) : (
          <Accordion multiple>
            {app.interviewRounds.map((round) => (
              <AccordionItem key={round.id} value={round.id}>
                <AccordionTrigger>
                  {/* Round N · type · when · mode · status · result —
                      the timeline reads off this line alone. */}
                  <span className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1 pr-2">
                    {round.roundNumber !== null && (
                      <span className="font-label text-xs text-muted-foreground">
                        Round {round.roundNumber}
                      </span>
                    )}
                    <span className="font-medium">{round.type}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(round.scheduledAt)} · {round.mode}
                    </span>
                    <Badge variant={ROUND_STATUS_BADGE_VARIANTS[round.status]}>
                      {ROUND_STATUS_LABELS[round.status]}
                    </Badge>
                    {round.result && (
                      <Badge variant={ROUND_RESULT_BADGE_VARIANTS[round.result]}>
                        {ROUND_RESULT_LABELS[round.result]}
                      </Badge>
                    )}
                    {needsDebrief(round) && (
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-destructive"
                        title="Needs debrief"
                      />
                    )}
                  </span>
                </AccordionTrigger>
                {/* px-1 pb-1: AccordionContent needs overflow-hidden for its
                    collapse animation, which clips the focus ring off any
                    input sitting flush against its edge. */}
                <AccordionContent className="px-1 pb-1">
                  <RoundEditor app={app} round={round} onUpdated={onUpdated} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
