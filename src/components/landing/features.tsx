import {
  FileText,
  Target,
  ScanSearch,
  PenLine,
  UserCheck,
  KanbanSquare,
  BellRing,
  CloudUpload,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";

const FEATURES = [
  {
    icon: FileText,
    title: "Resume Parsing",
    description:
      "Upload a PDF or DOCX and AI extracts your skills, experience, education, and projects into an editable profile.",
  },
  {
    icon: Target,
    title: "AI Job Match Analysis",
    description:
      "Paste any job description and get an instant fit score against your real experience.",
  },
  {
    icon: ScanSearch,
    title: "Skill Gap Detection",
    description:
      "See exactly which required skills you're missing, with concrete suggestions to close the gap.",
  },
  {
    icon: PenLine,
    title: "AI Cover Letter Generation",
    description:
      "Generate a tailored cover letter in your preferred tone, ready to edit inline.",
  },
  {
    icon: UserCheck,
    title: "Human Approval Workflow",
    description:
      "The AI suggests, you decide. Nothing is sent or saved without your explicit review.",
  },
  {
    icon: KanbanSquare,
    title: "Application Tracking",
    description:
      "Track every application from Applied to Offer on a drag-and-drop Kanban board.",
  },
  {
    icon: BellRing,
    title: "Smart Follow-up Reminders",
    description:
      "Never miss a follow-up — get nudged at the right moment for every open application.",
  },
  {
    icon: CloudUpload,
    title: "Secure Cloud Resume Storage",
    description:
      "Your resumes and profile data are stored securely and stay under your control.",
  },
];

export function Features() {
  return (
    <section id="features" className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeading
            eyebrow="Features"
            title="Everything you need to apply smarter"
            description="A complete toolkit for every stage of the job search — from parsing your resume to tracking the offer."
          />
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }, i) => (
            <Reveal key={title} delay={(i % 4) * 80}>
              <Card className="group h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-foreground/15">
                <CardHeader>
                  <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-secondary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-4.5" />
                  </div>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {description}
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
