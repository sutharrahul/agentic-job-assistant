"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/layout/page-heading";
import {
  Application,
  ApplicationStatus,
  InterviewRound,
} from "@/lib/types/application";
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

// A round paired with the application it belongs to — the upcoming list is
// the one cross-application view on this page, so rows need both.
type UpcomingInterview = { app: Application; round: InterviewRound };

// "Upcoming" is deliberately narrow: still SCHEDULED (a COMPLETED or
// CANCELLED round is history, not a commitment) and still in the future.
// Every future round is listed, not just each application's next one — two
// rounds booked at the same company are two things to prepare for, and
// collapsing them would hide the second.
function upcomingInterviews(apps: Application[]): UpcomingInterview[] {
  const now = Date.now();
  return apps
    .flatMap((app) =>
      app.interviewRounds
        .filter(
          (round) =>
            round.status === "SCHEDULED" &&
            new Date(round.scheduledAt).getTime() >= now,
        )
        .map((round) => ({ app, round })),
    )
    .sort(
      (a, b) =>
        new Date(a.round.scheduledAt).getTime() -
        new Date(b.round.scheduledAt).getTime(),
    );
}

function formatInterviewSlot(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
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
  const [loadFailed, setLoadFailed] = useState(false);
  // Bumped by the retry button to re-run the effect below.
  const [retryKey, setRetryKey] = useState(0);
  const todayLabel = useSyncExternalStore(
    subscribeToNothing,
    getTodayLabel,
    getServerTodayLabel,
  );

  // loadFailed is tracked separately from an empty `apps` array — without
  // it, a cold-started backend and a genuinely new user with zero
  // applications rendered identically, which reads as "my data is gone"
  // to a returning user. See the same fix in resume/page.tsx.
  useEffect(() => {
    listApplications()
      .then((data) => {
        setApps(data);
        setLoadFailed(false);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setIsLoading(false));
  }, [retryKey]);

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
  const upcoming = upcomingInterviews(apps);
  // Same cap as "Recent applications", but the overflow is stated rather
  // than silently dropped — a hidden interview is the one thing on this
  // page you cannot afford to miss.
  const visibleUpcoming = upcoming.slice(0, 5);

  if (loadFailed) {
    return (
      <div>
        <PageHeading crumbs={["Workspace", "Dashboard"]} title="Dashboard" />
        <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
          <p className="text-sm text-destructive">
            We couldn&apos;t load your applications. The server may still be
            waking up.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setIsLoading(true);
              setRetryKey((k) => k + 1);
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

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

          {/* Above "Recent applications" on purpose: a scheduled interview
              is the only time-critical thing on this page. */}
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Upcoming interviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {visibleUpcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No interviews scheduled — add a round from an application to
                  see it here.
                </p>
              ) : (
                <>
                  {visibleUpcoming.map(({ app, round }) => (
                    <Link
                      key={round.id}
                      href={`/applications/${app.id}`}
                      className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-xl border px-3.5 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="font-heading truncate font-semibold">
                          {app.jobTitle}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {app.company}
                          {" · "}
                          {round.roundNumber ? `Round ${round.roundNumber} · ` : ""}
                          {round.type} · {round.mode}
                        </p>
                      </div>
                      <span className="font-label shrink-0 text-xs text-muted-foreground">
                        {formatInterviewSlot(round.scheduledAt)}
                      </span>
                    </Link>
                  ))}
                  {upcoming.length > visibleUpcoming.length && (
                    <p className="text-xs text-muted-foreground">
                      +{upcoming.length - visibleUpcoming.length} more scheduled.
                    </p>
                  )}
                </>
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
