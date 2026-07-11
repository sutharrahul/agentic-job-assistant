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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FitAnalysisCard } from "@/components/applications/fit-analysis-card";
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
      <p className="p-4 text-sm text-muted-foreground sm:p-6 lg:p-8">
        Loading application...
      </p>
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
    // matters more than the rare failed PATCH (state refetches on nav).
    setApp((prev) => (prev ? { ...prev, status } : prev));
    void updateApplication(id, { status });
  }

  async function handleSaveNotes() {
    const updated = await updateApplication(id, { notes });
    setApp(updated);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  async function handleDelete() {
    await deleteApplication(id);
    router.push("/applications");
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Link
        href="/applications"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to board
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{app.company}</h1>
            {isStale(app) && (
              <Badge variant="destructive">
                <Clock data-icon="inline-start" />
                Follow up
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{app.jobTitle}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
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
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Job description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="max-h-80 overflow-y-auto text-sm whitespace-pre-wrap text-muted-foreground">
                {app.jobDescription}
              </p>
            </CardContent>
          </Card>

          <CoverLetterCard app={app} onUpdated={setApp} />
        </div>

        <div className="space-y-4">
          <FitAnalysisCard app={app} onUpdated={setApp} />

          <Card>
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

          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 data-icon="inline-start" />
            Delete application
          </Button>
        </div>

        {/* Full-width: prep packs are long-form reading, so they get the
            whole row under the grid instead of squeezing into a column. */}
        <div className="lg:col-span-3">
          <InterviewPrepCard app={app} onUpdated={setApp} />
        </div>
      </div>
    </div>
  );
}
