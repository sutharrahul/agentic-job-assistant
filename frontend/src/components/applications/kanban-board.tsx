"use client";

import Link from "next/link";
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
import { LayoutGrid, List as ListIcon, Plus } from "lucide-react";
import { KanbanColumn } from "@/components/applications/kanban-column";
import { ApplicationCardView } from "@/components/applications/application-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Application, ApplicationStatus } from "@/lib/types/application";
import { listApplications, updateApplication } from "@/lib/api/applications";
import { cn } from "@/lib/utils";

const COLUMNS: { status: ApplicationStatus; title: string }[] = [
  { status: "APPLIED", title: "Applied" },
  { status: "INTERVIEW", title: "Interview" },
  { status: "OFFER", title: "Offer" },
  { status: "REJECTED", title: "Rejected" },
];

const STATUSES = COLUMNS.map((c) => c.status);

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

const STATUS_BADGE_VARIANTS: Record<
  ApplicationStatus,
  "outline" | "secondary" | "default" | "destructive"
> = {
  APPLIED: "outline",
  INTERVIEW: "secondary",
  OFFER: "default",
  REJECTED: "destructive",
};

// Spelled out for one digit, numeral from two — reads like a sentence at
// small counts ("Six applications") without turning into "14
// applications" as words once the board fills up.
const ONES = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
function spellCount(n: number) {
  return n < 10 ? ONES[n] : String(n);
}

export function KanbanBoard() {
  const [apps, setApps] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeApp, setActiveApp] = useState<Application | null>(null);
  const [view, setView] = useState<"board" | "list">("board");

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

  function handleDeleted(id: string) {
    setApps((prev) => prev.filter((a) => a.id !== id));
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading applications...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Toolbar: a real count-driven subtitle, a Board/List switcher, and
          the primary create action — lives here rather than in
          PageHeading because it needs `apps`, which this component
          already owns. */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-2 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">
          {apps.length === 0
            ? "No applications yet."
            : `${spellCount(apps.length)} application${apps.length === 1 ? "" : "s"}, tracked from applied to offer.`}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-xl border bg-card p-0.5">
            <button
              type="button"
              onClick={() => setView("board")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                view === "board"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="size-3.5" />
              Board
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ListIcon className="size-3.5" />
              List
            </button>
          </div>
          <Button
            className="bg-purple hover:bg-purple-dark"
            nativeButton={false}
            render={<Link href="/applications/new" />}
          >
            <Plus data-icon="inline-start" />
            Add application
          </Button>
        </div>
      </div>

      {error && (
        <p className="px-4 pt-2 text-sm text-destructive sm:px-6 lg:px-8">
          {error}
        </p>
      )}

      {view === "list" ? (
        <div className="flex-1 space-y-1 p-4 sm:p-6 lg:p-8">
          {apps.length === 0 && (
            <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
              No applications yet — add your first one to get started.
            </p>
          )}
          {[...apps]
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            )
            .map((app) => (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="font-heading truncate font-semibold">
                    {app.company}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {app.jobTitle}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {app.fitScore !== null && (
                    <span className="font-label text-xs text-muted-foreground">
                      {Math.round(app.fitScore)} fit
                    </span>
                  )}
                  <Badge variant={STATUS_BADGE_VARIANTS[app.status]}>
                    {STATUS_LABELS[app.status]}
                  </Badge>
                </div>
              </Link>
            ))}
        </div>
      ) : (
        // A responsive grid instead of a horizontally scrolling row: columns
        // stack on mobile and sit two per row from sm: up — wide lanes with
        // big readable cards, and the page only ever scrolls vertically.
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveApp(null)}
        >
          <div className="grid flex-1 grid-cols-1 items-start gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4 lg:p-8">
            {COLUMNS.map(({ status, title }) => (
              <KanbanColumn
                key={status}
                status={status}
                title={title}
                apps={apps.filter((app) => app.status === status)}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
          <DragOverlay>
            {activeApp && (
              <ApplicationCardView app={activeApp} className="rotate-2 shadow-lg" />
            )}
          </DragOverlay>
        </DndContext>
      )}

      <p className="px-4 pb-6 text-xs text-muted-foreground sm:px-6 lg:px-8">
        Drag cards to update a stage. Add notes and next steps from an
        application.
      </p>
    </div>
  );
}
