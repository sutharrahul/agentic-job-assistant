"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { ArrowRight, LayoutGrid, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const VALUE_PROPS = [
  {
    icon: ShieldCheck,
    title: "Human approval, always",
    description:
      "AI drafts. You decide what leaves your desk. Nothing auto-applies or silently edits your resume.",
  },
  {
    icon: Sparkles,
    title: "Grounded in your resume",
    description:
      "Fit scores and cover letters connect directly to your actual skills, experience, and the job in front of you.",
  },
  {
    icon: LayoutGrid,
    title: "One clear workspace",
    description:
      "Resume, applications, fit analysis, and interview prep — all in one place, all yours.",
  },
];

export function Hero() {
  const { isLoaded, isSignedIn } = useAuth();
  const showSignedIn = isLoaded && isSignedIn;

  function scrollToWorkflow() {
    document.getElementById("workflow")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="px-4 pt-20 pb-16 sm:px-6 sm:pt-28">
      {/* Left-aligned, contained rather than centered — a deliberate
          departure from the centered-hero pattern the rest of this
          codebase's UI leans on, matching the more editorial reference
          this section was built from. */}
      <div className="mx-auto max-w-3xl">
        <p className="font-label text-xs font-bold tracking-widest text-muted-foreground uppercase">
          Your AI job assistant
        </p>

        <h1 className="font-heading mt-4 text-5xl leading-[1.05] font-bold tracking-tight text-balance sm:text-7xl">
          Good applications
          <br />
          <span className="text-purple">start with your story.</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg text-balance text-muted-foreground">
          Agentic Job Assistant turns your resume and a job description into
          a grounded fit score, a tailored cover letter, and a clear next
          step. You stay the author. You stay the approver.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            nativeButton={false}
            render={<Link href={showSignedIn ? "/dashboard" : "/signup"} />}
          >
            {showSignedIn ? "Go to your dashboard" : "Build an application"}
            <ArrowRight data-icon="inline-end" />
          </Button>
          <Button size="lg" variant="outline" onClick={scrollToWorkflow}>
            See how it works
          </Button>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-5xl border-t pt-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
            <div key={title}>
              <Icon className="size-4 text-purple" />
              <h2 className="font-heading mt-3 text-sm font-semibold">
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="mx-auto mt-16 max-w-2xl text-center text-xl font-semibold text-balance sm:text-2xl">
        &ldquo;The right kind of help leaves the work still{" "}
        <span className="text-purple">recognizably yours.</span>&rdquo;
      </p>
    </section>
  );
}
