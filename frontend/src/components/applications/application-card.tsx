"use client";

import Link from "next/link";
import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CalendarDays, MoreHorizontal, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Application } from "@/lib/types/application";
import {
  deleteApplication,
  hasUndebriefedRound,
  isStale,
  nextScheduledRound,
} from "@/lib/api/applications";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

// Calendar-day difference, not a raw 24h-block count — a round scheduled
// for 1am tomorrow should still read "Tomorrow", not "Today".
function dueLabel(scheduledAt: string) {
  const now = new Date();
  const target = new Date(scheduledAt);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  const dayDiff = Math.round(
    (startOfTarget.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Tomorrow";
  return `In ${dayDiff} days`;
}

// The one per-stage "what's next" signal worth putting on the card face
// (everything else lives on the detail page), in priority order: a stale
// Applied card needs a follow-up; an upcoming round needs the candidate to
// show up; a completed round with no debrief needs five minutes of
// reflection; an Interview card without a prep pack yet needs one
// generated; Offer/Rejected cards surface their real deadline instead.
function NextStep({ app }: { app: Application }) {
  if (app.status === "APPLIED" && isStale(app)) {
    return <Badge variant="warm">Follow up</Badge>;
  }
  const upcoming = nextScheduledRound(app);
  if (upcoming) {
    // variant="warm" deliberately matches the "Follow up" badge above —
    // both are time-sensitive nudges, not calls to action.
    return <Badge variant="warm">{dueLabel(upcoming.scheduledAt)}</Badge>;
  }
  if (hasUndebriefedRound(app)) {
    return <Badge variant="outline">Debrief</Badge>;
  }
  if (app.status === "INTERVIEW" && !app.interviewPrep) {
    return <Badge variant="outline">Prep</Badge>;
  }
  if ((app.status === "OFFER" || app.status === "REJECTED") && app.deadline) {
    return (
      <span
        className="flex items-center text-muted-foreground"
        title={`Deadline ${formatDate(app.deadline)}`}
      >
        <CalendarDays className="size-3.5" />
      </span>
    );
  }
  return null;
}

// Pure presentation — used both inside the draggable wrapper below and as
// the DragOverlay preview in kanban-board.tsx (the overlay must not carry
// drag listeners or a delete menu of its own, hence onDelete being
// optional and the split between this and DraggableApplicationCard).
export function ApplicationCardView({
  app,
  className,
  onDelete,
}: {
  app: Application;
  className?: string;
  onDelete?: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    // Stops the click from bubbling to both the draggable wrapper (which
    // would otherwise treat this as the start of a drag gesture) and the
    // surrounding <Link> (which would otherwise navigate to the detail
    // page instead of deleting).
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete ${app.company} — ${app.jobTitle}?`)) return;
    setIsDeleting(true);
    try {
      await deleteApplication(app.id);
      onDelete?.();
    } catch {
      setIsDeleting(false);
    }
  }

  return (
    <Card
      className={cn(
        "rounded-xl shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover",
        isDeleting && "pointer-events-none opacity-50",
        className,
      )}
    >
      <CardContent className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-heading truncate font-semibold">{app.company}</p>
          {onDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mt-1 -mr-1 size-6 shrink-0 text-muted-foreground"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                }
              >
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Card actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                  <Trash2 data-icon="inline-start" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">{app.jobTitle}</p>
        <div className="flex items-center gap-2">
          {app.fitScore !== null && (
            <span className="font-label text-xs text-muted-foreground">
              {Math.round(app.fitScore)} fit
            </span>
          )}
          <span className="ml-auto">
            <NextStep app={app} />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function DraggableApplicationCard({
  app,
  onDeleted,
}: {
  app: Application;
  onDeleted: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: app.id,
  });

  return (
    // The card is both a drag handle and a link. The board's sensors only
    // start a drag after 6px of movement (mouse) or a 250ms hold (touch),
    // so a plain click/tap still falls through to the Link navigation —
    // and the delete menu's own stopPropagation keeps IT from triggering
    // either the drag or the navigation.
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(isDragging && "opacity-40")}
      style={{ touchAction: "manipulation" }}
    >
      <Link href={`/applications/${app.id}`} draggable={false}>
        <ApplicationCardView app={app} onDelete={() => onDeleted(app.id)} />
      </Link>
    </div>
  );
}
