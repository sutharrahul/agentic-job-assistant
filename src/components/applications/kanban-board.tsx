"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/applications/kanban-column";
import { ApplicationCardView } from "@/components/applications/application-card";
import { Application, ApplicationStatus } from "@/lib/types/application";
import { listApplications, updateApplication } from "@/lib/api/applications";

const COLUMNS: { status: ApplicationStatus; title: string }[] = [
  { status: "APPLIED", title: "Applied" },
  { status: "INTERVIEW", title: "Interview" },
  { status: "OFFER", title: "Offer" },
  { status: "REJECTED", title: "Rejected" },
];

const STATUSES = COLUMNS.map((c) => c.status);

export function KanbanBoard() {
  const [apps, setApps] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeApp, setActiveApp] = useState<Application | null>(null);

  useEffect(() => {
    listApplications()
      .then(setApps)
      .catch(() => setError("Couldn't load applications — is the backend running?"))
      .finally(() => setIsLoading(false));
  }, []);

  // Activation constraints are what keep the cards clickable: a mouse drag
  // only starts after 6px of movement, a touch drag after a 250ms hold —
  // anything shorter falls through as a normal click/tap on the card link.
  // The touch delay also leaves quick swipes free to scroll the board.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveApp(apps.find((app) => app.id === event.active.id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveApp(null);
    const { active, over } = event;
    if (!over) return;

    const status = over.id as ApplicationStatus;
    if (!STATUSES.includes(status)) return;

    const app = apps.find((a) => a.id === active.id);
    if (!app || app.status === status) return;

    // Optimistic update: move the card immediately (waiting ~200ms for
    // the PATCH before moving reads as jank), revert if the API fails.
    const previous = apps;
    setApps((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, status } : a)),
    );
    updateApplication(app.id, { status }).catch(() => {
      setApps(previous);
      setError("Couldn't save the status change — reverted.");
    });
  }

  if (isLoading) {
    return (
      <p className="p-4 text-sm text-muted-foreground sm:p-6 lg:p-8">
        Loading applications...
      </p>
    );
  }

  // One responsive container handles both breakpoints: on mobile there
  // are more columns than fit on screen, so overflow-x-auto makes it
  // scroll (snap-x/snap-mandatory + each column's snap-start makes that
  // scroll settle on column boundaries, like a carousel). On desktop,
  // four columns usually just fit — same markup, no separate "mobile"
  // vs "desktop" layout to keep in sync.
  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveApp(null)}
    >
      {error && (
        <p className="px-4 pt-2 text-sm text-destructive sm:px-6 lg:px-8">
          {error}
        </p>
      )}
      <div className="flex flex-1 gap-4 overflow-x-auto p-4 sm:p-6 lg:p-8 snap-x snap-mandatory">
        {COLUMNS.map(({ status, title }) => (
          <KanbanColumn
            key={status}
            status={status}
            title={title}
            apps={apps.filter((app) => app.status === status)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeApp && (
          <ApplicationCardView app={activeApp} className="rotate-2 shadow-lg" />
        )}
      </DragOverlay>
    </DndContext>
  );
}
