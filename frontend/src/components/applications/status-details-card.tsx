"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  PartyPopper,
  Send,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Application, ApplicationStatus } from "@/lib/types/application";
import { updateApplication, UpdateApplicationInput } from "@/lib/api/applications";
import { cn } from "@/lib/utils";

// Per-status header treatment — same hues as the kanban lanes so the
// card immediately reads as "this is about the Applied/Offer/… stage".
const STATUS_CONFIG: Record<
  ApplicationStatus,
  {
    title: string;
    description: string;
    icon: typeof Send;
    chipClass: string;
  }
> = {
  APPLIED: {
    title: "Application details",
    description: "Where and how you applied — useful when following up.",
    icon: Send,
    chipClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  INTERVIEW: {
    title: "Interview details",
    description: "Track the round and when it's happening.",
    icon: CalendarClock,
    chipClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  OFFER: {
    title: "Offer details",
    description: "Congrats! Capture the numbers while they're fresh.",
    icon: PartyPopper,
    chipClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  REJECTED: {
    title: "Rejection details",
    description: "Every no is data — note why, for the next application.",
    icon: XCircle,
    chipClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
};

// ISO from the API -> value an <input type="datetime-local"/"date"> can
// display. datetime-local wants LOCAL wall-clock time, so shift by the
// timezone offset before slicing (plain .slice on the UTC string would
// show the wrong hour).
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

export function StatusDetailsCard({
  app,
  onUpdated,
}: {
  app: Application;
  onUpdated: (app: Application) => void;
}) {
  const [appliedVia, setAppliedVia] = useState(app.appliedVia ?? "");
  const [interviewRound, setInterviewRound] = useState(
    app.interviewRound ?? "",
  );
  const [interviewAt, setInterviewAt] = useState(
    isoToDatetimeLocal(app.interviewAt),
  );
  const [offeredCtc, setOfferedCtc] = useState(app.offeredCtc ?? "");
  const [joiningDate, setJoiningDate] = useState(
    isoToDateInput(app.joiningDate),
  );
  const [rejectionStage, setRejectionStage] = useState(
    app.rejectionStage ?? "",
  );
  const [rejectionReason, setRejectionReason] = useState(
    app.rejectionReason ?? "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync when the row changes underneath us (status dropdown, kanban
  // drag elsewhere) so the form never shows another status's stale draft.
  useEffect(() => {
    setAppliedVia(app.appliedVia ?? "");
    setInterviewRound(app.interviewRound ?? "");
    setInterviewAt(isoToDatetimeLocal(app.interviewAt));
    setOfferedCtc(app.offeredCtc ?? "");
    setJoiningDate(isoToDateInput(app.joiningDate));
    setRejectionStage(app.rejectionStage ?? "");
    setRejectionReason(app.rejectionReason ?? "");
  }, [app]);

  async function handleSave() {
    // Only PATCH the group for the current status — the other groups'
    // inputs aren't even rendered, so sending them would just re-save
    // stale drafts.
    const patchByStatus: Record<ApplicationStatus, UpdateApplicationInput> = {
      APPLIED: { appliedVia },
      INTERVIEW: { interviewRound, interviewAt },
      OFFER: { offeredCtc, joiningDate },
      REJECTED: { rejectionStage, rejectionReason },
    };

    setIsSaving(true);
    setError(null);
    try {
      onUpdated(await updateApplication(app.id, patchByStatus[app.status]));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Couldn't save — please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const { title, description, icon: Icon, chipClass } =
    STATUS_CONFIG[app.status];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              chipClass,
            )}
          >
            <Icon className="size-4.5" />
          </span>
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {app.status === "APPLIED" && (
          <div className="space-y-2">
            <Label htmlFor="applied-via">Applied via</Label>
            <Input
              id="applied-via"
              placeholder="LinkedIn, referral, company site…"
              value={appliedVia}
              onChange={(e) => setAppliedVia(e.target.value)}
            />
          </div>
        )}

        {app.status === "INTERVIEW" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="interview-round">Round</Label>
              <Input
                id="interview-round"
                placeholder="Round 2 — Technical"
                value={interviewRound}
                onChange={(e) => setInterviewRound(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interview-at">Scheduled for</Label>
              <Input
                id="interview-at"
                type="datetime-local"
                value={interviewAt}
                onChange={(e) => setInterviewAt(e.target.value)}
              />
            </div>
          </>
        )}

        {app.status === "OFFER" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="offered-ctc">Offered CTC</Label>
              <Input
                id="offered-ctc"
                placeholder="₹14 LPA"
                value={offeredCtc}
                onChange={(e) => setOfferedCtc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="joining-date">Joining date</Label>
              <Input
                id="joining-date"
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
              />
            </div>
          </>
        )}

        {app.status === "REJECTED" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="rejection-stage">Rejected at stage</Label>
              <Input
                id="rejection-stage"
                placeholder="After technical round"
                value={rejectionStage}
                onChange={(e) => setRejectionStage(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Why it didn&apos;t work out</Label>
              <Textarea
                id="rejection-reason"
                rows={3}
                placeholder="Feedback from the recruiter, skills they wanted, or your own read…"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save details"}
          </Button>
          {saved && (
            <span className="text-xs text-muted-foreground">Saved</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
