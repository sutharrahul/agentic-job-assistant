"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";
import { Application, ApplicationStatus } from "@/lib/types/application";
import { isStale, listApplications } from "@/lib/api/applications";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

const STATUS_VARIANTS: Record<
  ApplicationStatus,
  "outline" | "secondary" | "default" | "destructive"
> = {
  APPLIED: "outline",
  INTERVIEW: "secondary",
  OFFER: "default",
  REJECTED: "destructive",
};

const STATUS_DOT_COLORS: Record<ApplicationStatus, string> = {
  APPLIED: "bg-sky-500",
  INTERVIEW: "bg-amber-500",
  OFFER: "bg-emerald-500",
  REJECTED: "bg-rose-400",
};

const DAY_MS = 1000 * 60 * 60 * 24;

// Zero-pad single-digit stat numbers ("6" -> "06") to match the reference's
// big-number treatment.
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS));
}

function countAddedInLastWeek(apps: Application[]): number {
  return apps.filter((a) => Date.now() - new Date(a.createdAt).getTime() < 7 * DAY_MS)
    .length;
}

// "Now" is external, mutable state from the client's clock — the server
// can't know it, and the user's local timezone can disagree with the
// server's, so the label is read via useSyncExternalStore (never during
// render itself) with a null server snapshot instead of guessed client-side
// and risking a hydration mismatch.
function subscribeToNothing() {
  return () => {};
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getServerTodayLabel(): string | null {
  return null;
}

export default function DashboardPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const todayLabel = useSyncExternalStore(
    subscribeToNothing,
    getTodayLabel,
    getServerTodayLabel,
  );

  useEffect(() => {
    listApplications()
      .then(setApps)
      .catch(() =>
        toast.error("Couldn't load applications — is the backend running?"),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const staleApps = apps.filter(isStale);
  const scored = apps.filter((app) => app.fitScore !== null);
  const avgFit = scored.length
    ? Math.round(
        scored.reduce((sum, app) => sum + (app.fitScore ?? 0), 0) /
          scored.length,
      )
    : null;

  const statusCounts = (
    Object.keys(STATUS_LABELS) as ApplicationStatus[]
  ).map((status) => ({
    status,
    count: apps.filter((a) => a.status === status).length,
  }));

  const interviewCount = apps.filter((a) => a.status === "INTERVIEW").length;
  const newThisWeek = countAddedInLastWeek(apps);

  const statCards = [
    {
      label: "Active applications",
      value: pad2(apps.length),
      caption:
        newThisWeek > 0
          ? `${newThisWeek} added this week`
          : "No new activity this week",
    },
    {
      label: "Interview stage",
      value: pad2(interviewCount),
      caption: "Updated moments ago",
    },
    {
      label: "Average fit score",
      value: avgFit !== null ? `${avgFit} / 100` : "— / 100",
      caption:
        avgFit !== null
          ? `Across ${scored.length} scored application${scored.length === 1 ? "" : "s"}`
          : "No applications scored yet",
    },
    {
      label: "Follow-ups due",
      value: pad2(staleApps.length),
      caption:
        staleApps.length > 0
          ? "Applied 7+ days ago, no response"
          : "All caught up",
    },
  ];

  const encouragement =
    staleApps.length > 0
      ? `${staleApps.length} follow-up${staleApps.length > 1 ? "s" : ""} waiting on you.`
      : "Nothing waiting on you.";

  // createdAt doubles as "applied at" — newest first.
  const recent = [...apps]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  const topStale = staleApps[0];

  return (
    <div>
      <PageHeading crumbs={["Workspace", "Dashboard"]} title="Dashboard" />

      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-label text-sm text-muted-foreground">
            {todayLabel ?? " "} · {isLoading ? "Loading…" : encouragement}
          </p>
          <Button
            className="bg-purple text-white hover:bg-purple-dark"
            nativeButton={false}
            render={<Link href="/applications/new" />}
          >
            <Plus data-icon="inline-start" />
            New application
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl bg-card p-5 shadow-card"
            >
              <p className="font-label text-xs font-bold tracking-widest text-muted-foreground uppercase">
                {card.label}
              </p>
              <p className="mt-2 font-heading text-4xl font-bold tracking-tight">
                {isLoading ? "—" : card.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isLoading ? " " : card.caption}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="min-w-0 lg:col-span-2">
            <CardHeader>
              <CardTitle>Needs your attention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : topStale ? (
                <div className="space-y-3">
                  <Badge variant="warm">Follow up today</Badge>
                  <div>
                    <p className="font-heading text-xl font-semibold">
                      {topStale.company}
                    </p>
                    <p className="text-muted-foreground">{topStale.jobTitle}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Applied {daysSince(topStale.createdAt)} days ago · no
                    response yet
                    {staleApps.length > 1 &&
                      ` — ${staleApps.length - 1} more waiting on you`}
                  </p>
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/applications/${topStale.id}`} />}
                  >
                    Draft a follow-up
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nothing waiting on you — every application is fresh.
                </p>
              )}

              {!isLoading && apps.length > 0 && (
                <div className="border-t pt-4">
                  <p className="font-label mb-2 text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    Pipeline
                  </p>
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                    {statusCounts.map(
                      ({ status, count }) =>
                        count > 0 && (
                          <div
                            key={status}
                            className={STATUS_DOT_COLORS[status]}
                            style={{ width: `${(count / apps.length) * 100}%` }}
                          />
                        ),
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {statusCounts.map(({ status, count }) => (
                      <span key={status} className="flex items-center gap-1.5">
                        <span
                          className={`size-1.5 rounded-full ${STATUS_DOT_COLORS[status]}`}
                        />
                        {STATUS_LABELS[status]}{" "}
                        <span className="font-medium text-foreground">
                          {count}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Recent applications</CardTitle>
            </CardHeader>
            <CardContent>
              {!isLoading && recent.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No applications yet — add your first one to get started.
                </p>
              )}
              <ul className="divide-y">
                {recent.map((app) => (
                  <li key={app.id}>
                    <Link
                      href={`/applications/${app.id}`}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-heading font-semibold">
                          {app.company}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {app.jobTitle}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {app.fitScore !== null && (
                          <Badge variant="secondary">
                            {Math.round(app.fitScore)}%
                          </Badge>
                        )}
                        <Badge variant={STATUS_VARIANTS[app.status]}>
                          {STATUS_LABELS[app.status]}
                        </Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
