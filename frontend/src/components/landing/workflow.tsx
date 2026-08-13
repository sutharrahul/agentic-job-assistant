import {
  Upload,
  FileSearch,
  ClipboardPaste,
  Gauge,
  PenLine,
  GraduationCap,
  CalendarClock,
} from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";

// Mirrors the flow the app actually supports today. The original list was
// written before interview prep and round tracking existed and stopped at
// "move the card to Offer", which is now the middle of the story rather
// than the end.
const STEPS = [
  {
    icon: Upload,
    title: "Upload your resume",
    description: "Drop in a PDF or DOCX. It's parsed once and reused everywhere.",
  },
  {
    icon: FileSearch,
    title: "Correct what the AI read",
    description:
      "Fix anything the parser got wrong — this profile is what every later step is graded against, not the file itself.",
  },
  {
    icon: ClipboardPaste,
    title: "Add a job",
    description: "Paste the description as it appears on the listing.",
  },
  {
    icon: Gauge,
    title: "See where you stand",
    description:
      "A fit score with the skills you match, the ones you're missing, and concrete edits to close the gap.",
  },
  {
    icon: PenLine,
    title: "Draft a cover letter",
    description:
      "Grounded in your resume, in the tone you pick. Editable inline, and nothing counts as approved until you say so.",
  },
  {
    icon: GraduationCap,
    title: "Prepare for the interview",
    description:
      "Study topics drawn from the job, plus the questions an interviewer would ask about your own projects. Generated once, then yours to revisit.",
  },
  {
    icon: CalendarClock,
    title: "Track every round to the outcome",
    description:
      "Schedule rounds, record the questions you were actually asked, log feedback and results — from applied through to the offer.",
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
                {/* Starts below the dropped icon (12 + 40 + 4 = 56px) and runs
                    12px past the row so it meets the next icon, which is
                    dropped by the same amount. */}
                {i < STEPS.length - 1 && (
                  <span className="absolute top-14 left-[19px] h-[calc(100%-2.75rem)] w-px bg-border" />
                )}
                {/* mt-3 drops the icon onto the title rather than onto the step
                    label above it: the title's first line is centred 32px down
                    the text column (16px label + 4px gap + half of a 24px line
                    box) and the icon's own centre is 20px, so it owes 12px.
                    Anchored to the first line, not the block, so a title that
                    wraps on a phone doesn't drag the icon down with it. */}
                <span className="relative z-10 mt-3 flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-sm font-medium shadow-sm transition-colors group-hover:border-foreground/30">
                  <Icon className="size-4.5" />
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Step {i + 1}
                  </span>
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
