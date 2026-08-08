import {
  Upload,
  FileSearch,
  ClipboardPaste,
  Gauge,
  PenLine,
  ListChecks,
  KanbanSquare,
} from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";

const STEPS = [
  {
    icon: Upload,
    title: "Upload Resume",
    description: "Drop in your existing resume as a PDF or DOCX.",
  },
  {
    icon: FileSearch,
    title: "AI Resume Parsing",
    description: "AI extracts your skills, experience, and education automatically.",
  },
  {
    icon: ClipboardPaste,
    title: "Paste Job Description",
    description: "Paste the listing you're applying to — no copy-paste gymnastics.",
  },
  {
    icon: Gauge,
    title: "Fit Analysis",
    description: "Get a fit score plus matched and missing skills at a glance.",
  },
  {
    icon: PenLine,
    title: "Generate Cover Letter",
    description: "AI drafts a tailored cover letter in your preferred tone.",
  },
  {
    icon: ListChecks,
    title: "Review & Edit",
    description: "Read everything, edit inline, and approve before anything is saved.",
  },
  {
    icon: KanbanSquare,
    title: "Track Application",
    description: "Move it across your Kanban board from Applied to Offer.",
  },
];

export function WorkflowSection() {
  return (
    <section id="workflow" className="border-t border-border px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <SectionHeading
            eyebrow="Workflow"
            title="From resume to offer, one guided flow"
            description="Every step keeps you in control — the AI drafts, you approve."
          />
        </Reveal>

        <div className="mt-14 flex flex-col">
          {STEPS.map(({ icon: Icon, title, description }, i) => (
            <Reveal key={title} delay={i * 70}>
              <div className="group relative flex gap-5 pb-10 last:pb-0">
                {i < STEPS.length - 1 && (
                  <span className="absolute top-11 left-[19px] h-[calc(100%-2.75rem)] w-px bg-border" />
                )}
                <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-sm font-medium shadow-sm transition-colors group-hover:border-foreground/30">
                  <Icon className="size-4.5" />
                </span>
                <div className="flex flex-col gap-1 pt-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="font-heading text-base font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
