"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Application } from "@/lib/types/application";
import { isStale } from "@/lib/api/applications";
import { cn } from "@/lib/utils";

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
  return (
    <Card size="sm" className={cn("transition-colors hover:bg-secondary/50", className)}>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium">{app.company}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{app.jobTitle}</p>
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
