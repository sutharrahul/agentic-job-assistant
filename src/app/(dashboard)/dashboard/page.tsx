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
    .slice(0, 4);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
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
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "…" : value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
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
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80"
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

        <Card>
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
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80"
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
