"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Briefcase,
  Clock,
  FileText,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function DashboardPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listApplications()
      .then(setApps)
      .catch(() => {})
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

  const stats = [
    { label: "Applications", value: String(apps.length), icon: Briefcase },
    {
      label: "Interviews",
      value: String(apps.filter((a) => a.status === "INTERVIEW").length),
      icon: Users,
    },
    {
      label: "Offers",
      value: String(apps.filter((a) => a.status === "OFFER").length),
      icon: TrendingUp,
    },
    {
      label: "Avg. fit score",
      value: avgFit !== null ? `${avgFit}%` : "—",
      icon: FileText,
    },
  ];

  // createdAt doubles as "applied at" — newest first.
  const recent = [...apps]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back — here&apos;s where your job search stands.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href="/applications/new" />}>
            <Plus data-icon="inline-start" />
            New application
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/resume" />}>
            <FileText data-icon="inline-start" />
            Upload resume
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/15">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-muted-foreground">
                  {label}
                </p>
                <p className="text-2xl font-semibold tracking-tight">
                  {isLoading ? "…" : value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isLoading && apps.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Your pipeline is empty — add an application to see the
                breakdown by stage.
              </p>
            )}
            {apps.length > 0 && (
              <>
                {/* One segmented bar for the whole pipeline, then a row
                    per stage — same data as the kanban board, at a glance. */}
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
                <ul className="space-y-3">
                  {statusCounts.map(({ status, count }) => (
                    <li
                      key={status}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`size-2 rounded-full ${STATUS_DOT_COLORS[status]}`}
                        />
                        {STATUS_LABELS[status]}
                      </span>
                      <span className="flex items-baseline gap-2">
                        <span className="font-semibold">{count}</span>
                        <span className="w-10 text-right text-xs text-muted-foreground">
                          {apps.length
                            ? Math.round((count / apps.length) * 100)
                            : 0}
                          %
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
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
                      <p className="truncate text-sm font-medium">
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

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Needs follow-up</CardTitle>
          </CardHeader>
          <CardContent>
            {!isLoading && staleApps.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing waiting on you — all applications are fresh.
              </p>
            )}
            <ul className="divide-y">
              {staleApps.map((app) => (
                <li key={app.id}>
                  <Link
                    href={`/applications/${app.id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {app.company}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {app.jobTitle}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      <Clock data-icon="inline-start" />
                      Follow up
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
