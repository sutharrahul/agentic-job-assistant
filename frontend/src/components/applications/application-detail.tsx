"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Clock,
  MapPin,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeading } from "@/components/layout/page-heading";
import { FitAnalysisCard } from "@/components/applications/fit-analysis-card";
import { StatusDetailsCard } from "@/components/applications/status-details-card";
import { CoverLetterCard } from "@/components/applications/cover-letter-card";
import { InterviewPrepCard } from "@/components/applications/interview-prep-card";
import { Application, ApplicationStatus } from "@/lib/types/application";
import {
  deleteApplication,
  getApplication,
  isStale,
  updateApplication,
} from "@/lib/api/applications";

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ApplicationDetail({ id }: { id: string }) {
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    getApplication(id)
      .then((data) => {
        setApp(data);
        setNotes(data.notes);
      })
      .catch(() => setApp(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <p className="text-muted-foreground">
          This application doesn&apos;t exist (or was removed).
        </p>
        <Button variant="outline" nativeButton={false} render={<Link href="/applications" />}>
          <ArrowLeft data-icon="inline-start" />
          Back to board
        </Button>
      </div>
    );
  }

  function handleStatusChange(status: ApplicationStatus) {
    // Optimistic — the dropdown closing + badge updating instantly
    // matters more than the rare failed PATCH — but a failed PATCH still
    // needs to be visible, or the UI and the database quietly disagree.
    const previous = app;
    setApp((prev) => (prev ? { ...prev, status } : prev));
    updateApplication(id, { status }).catch(() => {
      setApp(previous);
      toast.error("Couldn't save the status change — reverted.");
    });
  }

  async function handleSaveNotes() {
    try {
      const updated = await updateApplication(id, { notes });
      setApp(updated);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch {
      toast.error("Couldn't save notes — please try again.");
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteApplication(id);
      router.push("/applications");
    } catch {
      toast.error("Couldn't delete — please try again.");
      setIsDeleting(false);
    }
  }

  return (
    <div>
      {/* Breadcrumb + H1 row via the shared header — job title leads since
          that's the thing being tracked; company moves into the crumb. */}
      <PageHeading crumbs={["Application", app.company]} title={app.jobTitle} />

      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
        <Link
          href="/applications"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to board
        </Link>

        {/* Second header row: meta (location/dates/stale flag) on the
            left, status + delete actions on the right. Status is styled as
            the page's primary action — moving an application through the
            tracker — so it gets the solid coral treatment. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            {isStale(app) && (
              <Badge variant="destructive">
                <Clock data-icon="inline-start" />
                Follow up
              </Badge>
            )}
            {app.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {app.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              Applied {formatDate(app.createdAt)}
            </span>
            {app.deadline && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" />
                Deadline {formatDate(app.deadline)}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button className="bg-purple text-white hover:bg-purple-dark" />
                }
              >
                {STATUS_LABELS[app.status]}
                <ChevronDown data-icon="inline-end" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map(
                  (status) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => handleStatusChange(status)}
                    >
                      {STATUS_LABELS[status]}
                    </DropdownMenuItem>
                  ),
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger render={<Button variant="destructive" size="icon" />}>
                <Trash2 />
                <span className="sr-only">Delete application</span>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete this application?</DialogTitle>
                  <DialogDescription>
                    This removes {app.company} — {app.jobTitle}, along with its
                    fit analysis, cover letter, and interview prep. This
                    can&apos;t be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Fit overview + cover letter draft, side by side and prominent —
            the two things the reference design showcases up top. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FitAnalysisCard app={app} onUpdated={setApp} />
          <CoverLetterCard app={app} onUpdated={setApp} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* min-w-0 on every grid child: grid items refuse to shrink below
              their content width by default, so one long unbroken line (a
              URL in a job description, say) would otherwise push the whole
              page into horizontal overflow. */}
          <div className="min-w-0 lg:col-span-2">
            <Card className="rounded-2xl shadow-card">
              <CardHeader>
                <CardTitle>Job description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="max-h-80 overflow-y-auto text-sm break-words whitespace-pre-wrap text-muted-foreground">
                  {app.jobDescription}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="min-w-0 space-y-4">
            {/* Contextual per-status form — switches with the dropdown above. */}
            <StatusDetailsCard app={app} onUpdated={setApp} />

            <Card className="rounded-2xl shadow-card">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Recruiter contacts, interview prep, next steps..."
                  rows={5}
                />
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="outline" onClick={handleSaveNotes}>
                    Save notes
                  </Button>
                  {notesSaved && (
                    <span className="text-xs text-muted-foreground">Saved</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <InterviewPrepCard app={app} onUpdated={setApp} />
      </div>
    </div>
  );
}
