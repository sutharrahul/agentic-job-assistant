"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Application } from "@/lib/types/application";
import { isStale } from "@/lib/api/applications";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

// The one status-specific detail worth surfacing on the board (the rest
// live on the detail page): where you applied, when the interview is,
// what they offered, or where it fell through.
function statusDetail(app: Application): string | null {
  switch (app.status) {
    case "APPLIED":
      return app.appliedVia ? `via ${app.appliedVia}` : null;
    case "INTERVIEW":
      return app.interviewAt ? formatDateTime(app.interviewAt) : null;
    case "OFFER":
      return app.offeredCtc;
    case "REJECTED":
      return app.rejectionStage || app.rejectionReason;
  }
}

// Pure presentation — used both inside the draggable wrapper below and as
// the DragOverlay preview in kanban-board.tsx (the overlay must not carry
// drag listeners of its own, hence the split).
export function ApplicationCardView({
  app,
  className,
}: {
  app: Application;
  className?: string;
}) {
  const detail = statusDetail(app);

  return (
    <Card
      className={cn(
        "transition-all hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-heading text-base font-semibold text-primary dark:bg-primary/15">
            {app.company[0]?.toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-medium">{app.company}</p>
            <p className="truncate text-sm text-muted-foreground">
              {app.jobTitle}
            </p>
            {detail && (
              <p className="truncate text-xs text-muted-foreground/80">
                {detail}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {app.fitScore !== null && (
            <Badge variant="secondary">{Math.round(app.fitScore)}% fit</Badge>
          )}
          {isStale(app) && (
            <Badge variant="destructive">
              <Clock data-icon="inline-start" />
              Follow up
            </Badge>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {formatDate(app.createdAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function DraggableApplicationCard({ app }: { app: Application }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: app.id,
  });

  return (
    // The card is both a drag handle and a link. The board's sensors only
    // start a drag after 6px of movement (mouse) or a 250ms hold (touch),
    // so a plain click/tap still falls through to the Link navigation.
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(isDragging && "opacity-40")}
      style={{ touchAction: "manipulation" }}
    >
      <Link href={`/applications/${app.id}`} draggable={false}>
        <ApplicationCardView app={app} />
      </Link>
    </div>
  );
}
