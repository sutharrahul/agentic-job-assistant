"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Clock,
  FileText,
  Gauge,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";
import { KanbanBoard } from "@/components/applications/kanban-board";
import { ResumeUploadForm } from "@/components/resume/resume-upload-form";
import { ResumePreviewForm } from "@/components/resume/resume-preview-form";
import { Resume } from "@/lib/types/resume";
import { Application, ApplicationStatus } from "@/lib/types/application";
import { isStale, listApplications } from "@/lib/api/applications";
import { latestResume, listResumes } from "@/lib/api/resumes";
import { cn } from "@/lib/utils";

// Standalone all-in-one workspace: everything the dashboard's three nav
// pages do, on one scrollable page with its own chrome — intentionally
// OUTSIDE the (dashboard) route group so the app shell (navbar + sidebar)
// never renders here. Being compared against the multi-page layout;
// delete this directory to drop the experiment.

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "resume", label: "Resume" },
  { id: "board", label: "Board" },
];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  APPLIED: "bg-sky-500",
  INTERVIEW: "bg-amber-500",
  OFFER: "bg-emerald-500",
  REJECTED: "bg-rose-400",
};

export default function WorkspacePage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resume, setResume] = useState<Resume | null>(null);
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    listApplications()
      .then(setApps)
      .catch(() =>
        toast.error("Couldn't load applications — is the backend running?"),
      )
      .finally(() => setIsLoading(false));
    listResumes()
      .then((resumes) => setResume(latestResume(resumes)))
      .catch(() => toast.error("Couldn't load your resume."));
  }, []);

  // Scrollspy: highlight the pill for whichever section currently sits in
  // the middle band of the viewport (the rootMargin trims top/bottom so
  // only one section "wins" at a time).
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    for (const { id } of SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

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
      icon: Gauge,
    },
  ];

  const statusCounts = (
    Object.keys(STATUS_LABELS) as ApplicationStatus[]
  ).map((status) => ({
    status,
    count: apps.filter((a) => a.status === status).length,
  }));

  return (
    <div className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,color-mix(in_oklch,var(--primary)_9%,transparent),transparent)]"
      />

      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2 font-heading font-semibold">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <span className="hidden sm:inline">Workspace</span>
          </div>

          <nav className="flex items-center gap-1 rounded-full border bg-background/60 p-1">
            {SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollToSection(id)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                  activeSection === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button
              variant="ghost"
              size="icon"
              nativeButton={false}
              render={<Link href="/" />}
            >
              <X className="size-4" />
              <span className="sr-only">Exit workspace</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section id="overview" className="scroll-mt-20 py-10 sm:py-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-primary">Overview</p>
              <h1 className="font-heading text-3xl font-semibold tracking-tight">
                Your job search, one page
              </h1>
              <p className="mt-1 text-muted-foreground">
                Stats, resume, and the application board — no navigation
                needed.
              </p>
            </div>
            <Button
              nativeButton={false}
              render={<Link href="/applications/new" />}
            >
              <Plus data-icon="inline-start" />
              New application
            </Button>
          </div>

          <Card className="mt-6">
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
              {stats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="space-y-1">
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon className="size-4" />
                    {label}
                  </p>
                  <p className="font-heading text-3xl font-semibold tracking-tight">
                    {isLoading ? "…" : value}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {apps.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {statusCounts.map(
                  ({ status, count }) =>
                    count > 0 && (
                      <div
                        key={status}
                        className={cn(
                          "transition-all duration-500",
                          STATUS_COLORS[status],
                        )}
                        style={{ width: `${(count / apps.length) * 100}%` }}
                      />
                    ),
                )}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                {statusCounts.map(({ status, count }) => (
                  <span key={status} className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        STATUS_COLORS[status],
                      )}
                    />
                    {STATUS_LABELS[status]}
                    <span className="font-medium text-foreground">
                      {count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {staleApps.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="size-4 text-destructive" />
                {staleApps.length} waiting on a follow-up:
              </span>
              {staleApps.slice(0, 4).map((app) => (
                <Link
                  key={app.id}
                  href={`/applications/${app.id}`}
                  className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  {app.company}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section id="resume" className="scroll-mt-20 border-t py-10 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
            <div className="space-y-2 lg:sticky lg:top-24 lg:self-start">
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <FileText className="size-4" />
                Resume
              </p>
              <h2 className="font-heading text-2xl font-semibold tracking-tight">
                Your base profile
              </h2>
              <p className="text-sm text-muted-foreground">
                Upload once — every fit analysis, cover letter, and interview
                prep pack is grounded in this resume.
              </p>
            </div>

            <div className="min-w-0 max-w-2xl space-y-6">
              {!resume && <ResumeUploadForm onUploaded={setResume} />}

              {resume && resume.status === "FAILED" && (
                <p className="text-sm text-destructive">
                  We couldn&apos;t parse that resume. Try uploading it again.
                </p>
              )}

              {resume &&
                (resume.status === "PARSED" ||
                  resume.status === "CONFIRMED") && (
                  <ResumePreviewForm resume={resume} onConfirmed={setResume} />
                )}

              {resume?.status === "CONFIRMED" && (
                <p className="text-sm text-muted-foreground">
                  Saved as your base resume.
                </p>
              )}
            </div>
          </div>
        </section>

        <section id="board" className="scroll-mt-20 border-t py-10 sm:py-12">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <Briefcase className="size-4" />
            Board
          </p>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Application pipeline
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag cards between stages — changes save automatically.
          </p>
          {/* KanbanBoard brings its own p-4…p-8 padding (it fills the main
              area on /applications); the negative margins re-align it with
              this page's column instead of double-indenting. They must not
              exceed the container's px-4/sm:px-6, or the page overflows. */}
          <div className="-mx-4 sm:-mx-6">
            <KanbanBoard />
          </div>
        </section>
      </main>
    </div>
  );
}
