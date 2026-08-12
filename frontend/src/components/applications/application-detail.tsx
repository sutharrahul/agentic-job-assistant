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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeading } from "@/components/layout/page-heading";
import { FitAnalysisCard } from "@/components/applications/fit-analysis-card";
import { StatusDetailsCard } from "@/components/applications/status-details-card";
import { CoverLetterCard } from "@/components/applications/cover-letter-card";
import { InterviewRoundsCard } from "@/components/applications/interview-rounds-card";
import { InterviewPrepCard } from "@/components/applications/interview-prep-card";
import { Application, ApplicationStatus } from "@/lib/types/application";
import {
  addNote,
  deleteApplication,
  deleteNote,
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
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    getApplication(id)
      .then((data) => setApp(data))
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

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setIsAddingNote(true);
    try {
      setApp(await addNote(id, newNote.trim()));
      setNewNote("");
    } catch {
      toast.error("Couldn't add the note — please try again.");
    } finally {
      setIsAddingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    try {
      setApp(await deleteNote(id, noteId));
    } catch {
      toast.error("Couldn't delete the note — please try again.");
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

        {/* Tabbed workspace: job description, per-status details + notes,
            and interview prep each get their own focused view instead of
            competing for space in a stacked/grid layout — the page no
            longer grows as tall as its longest section. */}
        <Tabs defaultValue="overview" className="gap-4">
          <TabsList variant="line" className="h-auto w-fit gap-1 bg-transparent p-0">
            <TabsTrigger
              value="overview"
              className="h-auto flex-none rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground after:hidden data-active:!bg-primary data-active:!text-primary-foreground data-active:!shadow-none"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="details"
              className="h-auto flex-none rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground after:hidden data-active:!bg-primary data-active:!text-primary-foreground data-active:!shadow-none"
            >
              Details &amp; notes
            </TabsTrigger>
            {/* Unlike the prep gate below, this persists past the Interview
                stage — a rejected application's debrief notes are the most
                valuable ones, so the tab shouldn't vanish with the status. */}
            {(app.status === "APPLIED" ||
              app.status === "INTERVIEW" ||
              app.interviewRounds.length > 0) && (
              <TabsTrigger
                value="rounds"
                className="h-auto flex-none rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground after:hidden data-active:!bg-primary data-active:!text-primary-foreground data-active:!shadow-none"
              >
                Interview rounds
              </TabsTrigger>
            )}
            {(app.status === "APPLIED" || app.status === "INTERVIEW") && (
              <TabsTrigger
                value="prep"
                className="h-auto flex-none rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground after:hidden data-active:!bg-primary data-active:!text-primary-foreground data-active:!shadow-none"
              >
                Interview prep
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview">
            <Card className="rounded-2xl shadow-card">
              <CardHeader>
                <CardTitle>Job description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="max-h-[32rem] overflow-y-auto text-sm break-words whitespace-pre-wrap text-muted-foreground">
                  {app.jobDescription}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {/* Contextual per-status form — switches with the dropdown above. */}
            <StatusDetailsCard app={app} onUpdated={setApp} />

            <Card className="rounded-2xl shadow-card">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Recruiter contacts, interview prep, next steps..."
                  rows={5}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddNote}
                  disabled={isAddingNote || !newNote.trim()}
                >
                  Add note
                </Button>

                {app.notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notes yet.</p>
                ) : (
                  <ul className="max-h-80 space-y-2 overflow-y-auto">
                    {[...app.notes].reverse().map((note) => (
                      <li
                        key={note.id}
                        className="flex items-start justify-between gap-2 rounded-lg border border-border p-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="break-words whitespace-pre-wrap">
                            {note.content}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(note.createdAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Delete this note?")) {
                              handleDeleteNote(note.id);
                            }
                          }}
                          className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Delete note</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {(app.status === "APPLIED" ||
            app.status === "INTERVIEW" ||
            app.interviewRounds.length > 0) && (
            <TabsContent value="rounds">
              <InterviewRoundsCard app={app} onUpdated={setApp} />
            </TabsContent>
          )}

          {(app.status === "APPLIED" || app.status === "INTERVIEW") && (
            <TabsContent value="prep">
              <InterviewPrepCard app={app} onUpdated={setApp} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
