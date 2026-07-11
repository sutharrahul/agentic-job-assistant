"use client";

import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { DraggableApplicationCard } from "@/components/applications/application-card";
import { Application, ApplicationStatus } from "@/lib/types/application";
import { cn } from "@/lib/utils";

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
    // w-[85vw] on mobile: wide enough to read comfortably, narrow enough
    // that the next column peeks in at the edge (a visual hint that more
    // content is scrollable). sm:w-72 once there's room to show more
    // than one column at a time without relying on that hint.
    <div className="flex w-[85vw] shrink-0 snap-start flex-col gap-3 sm:w-72">
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge variant="outline">{apps.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-lg p-1 transition-colors",
          isOver && "bg-secondary/60 ring-2 ring-ring/40",
        )}
      >
        {apps.length === 0 && (
          <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
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
