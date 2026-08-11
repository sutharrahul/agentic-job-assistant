"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeading } from "@/components/layout/page-heading";
import { createApplication } from "@/lib/api/applications";

// Shared styling for the taller, bg-card inputs used across this form —
// passed as className to the existing Input/Textarea components rather
// than rebuilding them.
const fieldClassName = "h-auto rounded-xl border-border bg-card px-4 py-3 text-base";

// JD intake: company/role metadata + pasted job description text,
// POSTed to NestJS (/applications).
export default function NewApplicationPage() {
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [deadline, setDeadline] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const app = await createApplication({
        company: company.trim(),
        jobTitle: jobTitle.trim(),
        location: location.trim() || undefined,
        deadline: deadline || undefined,
        jobDescription: jobDescription.trim(),
      });
      router.push(`/applications/${app.id}`);
    } catch {
      setError("Couldn't save the application — please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeading crumbs={["Workspace", "New application"]} title="New application" />

      <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
        <form onSubmit={handleSubmit}>
          <div className="rounded-2xl bg-card p-6 shadow-card sm:p-8">
            <p className="font-label text-xs font-bold tracking-widest text-muted-foreground uppercase">
              Step 01 / 01
            </p>
            <h2 className="font-heading mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Bring a role to the desk.
            </h2>
            <p className="mt-2 text-muted-foreground">
              Paste the job description as it appears. We&apos;ll compare it to
              your reviewed resume and show a fit score before you draft
              anything.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Input
                  id="company"
                  required
                  placeholder="Acme Corp"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className={fieldClassName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Role *</Label>
                <Input
                  id="jobTitle"
                  required
                  placeholder="Frontend Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className={fieldClassName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  placeholder="Remote / Bengaluru"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={fieldClassName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Application deadline (optional)</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={fieldClassName}
                />
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <Label htmlFor="jobDescription">Job description *</Label>
              <Textarea
                id="jobDescription"
                required
                rows={12}
                placeholder="Paste the full job description here…"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className={`min-h-56 ${fieldClassName}`}
              />
            </div>

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

            <div className="mt-8 flex flex-col-reverse items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-label flex items-center gap-1.5 text-xs tracking-widest text-muted-foreground uppercase">
                <Sparkles className="size-3.5" />
                Your resume stays unchanged.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/applications")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-purple text-white hover:bg-purple-dark"
                >
                  {isSubmitting ? "Saving..." : "Save application"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
