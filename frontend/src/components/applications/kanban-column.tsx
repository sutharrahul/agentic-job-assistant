"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { DraggableApplicationCard } from "@/components/applications/application-card";
import { Application, ApplicationStatus } from "@/lib/types/application";
import { cn } from "@/lib/utils";

export function KanbanColumn({
  status,
  title,
  apps,
  onDeleted,
}: {
  status: ApplicationStatus;
  title: string;
  apps: Application[];
  onDeleted: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    // min-w-0 lets the column shrink inside its grid track — a long
    // company name must truncate in the card, not widen the page.
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline gap-2 px-1">
        <h2 className="font-heading text-sm font-semibold">{title}</h2>
        <span className="ml-auto text-xs font-medium text-muted-foreground">
          {apps.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-28 flex-col gap-2 rounded-xl transition-colors",
          isOver && "bg-purple-subtle ring-2 ring-purple/40",
        )}
      >
        {apps.length === 0 && (
          <p className="rounded-xl border border-dashed py-6 text-center text-xs text-muted-foreground">
            No applications yet
          </p>
        )}
        {apps.map((app) => (
          <DraggableApplicationCard key={app.id} app={app} onDeleted={onDeleted} />
        ))}
        <Link
          href="/applications/new"
          className="flex items-center gap-1.5 rounded-xl border border-dashed px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-purple hover:text-purple"
        >
          <Plus className="size-3.5" />
          Add card
        </Link>
      </div>
    </div>
  );
}
