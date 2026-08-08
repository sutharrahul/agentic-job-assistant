"use client";

import { useDroppable } from "@dnd-kit/core";
import { DraggableApplicationCard } from "@/components/applications/application-card";
import { Application, ApplicationStatus } from "@/lib/types/application";
import { cn } from "@/lib/utils";

const STATUS_DOT_COLORS: Record<ApplicationStatus, string> = {
  APPLIED: "bg-sky-500",
  INTERVIEW: "bg-amber-500",
  OFFER: "bg-emerald-500",
  REJECTED: "bg-rose-400",
};

export function KanbanColumn({
  status,
  title,
  apps,
}: {
  status: ApplicationStatus;
  title: string;
  apps: Application[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    // min-w-0 lets the column shrink inside its grid track — a long
    // company name must truncate in the card, not widen the page.
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <span
          className={cn("size-2 rounded-full", STATUS_DOT_COLORS[status])}
        />
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {apps.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-28 flex-col gap-2 rounded-xl bg-muted/40 p-2 transition-colors",
          isOver && "bg-primary/5 ring-2 ring-primary/40",
        )}
      >
        {apps.length === 0 && (
          <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
            No applications yet
          </p>
        )}
        {apps.map((app) => (
          <DraggableApplicationCard key={app.id} app={app} />
        ))}
      </div>
    </div>
  );
}
