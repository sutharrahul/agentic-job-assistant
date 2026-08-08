"use client";

import Link from "next/link";
import { ArrowRight, Play, Sparkles, Gauge, FileCheck2, PenLine, MessageSquareHeart } from "lucide-react";
import { Show } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  function scrollToDemo() {
    document.getElementById("dashboard-preview")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="relative overflow-hidden px-4 pt-16 pb-24 sm:px-6 sm:pt-24 sm:pb-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent)]"
      />

      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
          <Badge variant="secondary">
            <Sparkles data-icon="inline-start" />
            AI-powered job search
          </Badge>
        </div>

        <h1 className="animate-in fade-in slide-in-from-bottom-3 font-heading text-4xl font-semibold tracking-tight text-balance duration-700 sm:text-6xl">
          Land Your Next Job with AI
        </h1>

        <p className="animate-in fade-in slide-in-from-bottom-3 max-w-xl text-lg text-balance text-muted-foreground duration-700">
          Upload your resume, paste a job description, and get a fit score,
          skill-gap analysis, and a tailored cover letter — reviewed and
          approved by you before anything is saved.
        </p>

        <div className="animate-in fade-in slide-in-from-bottom-3 flex w-full flex-col gap-3 duration-700 sm:w-auto sm:flex-row">
          <Show
            when="signed-out"
            fallback={
              <Button
                size="lg"
                className="gap-1.5"
                nativeButton={false}
                render={<Link href="/dashboard" />}
              >
                Go to app
                <ArrowRight data-icon="inline-end" />
              </Button>
            }
          >
            <Button
              size="lg"
              className="gap-1.5"
              nativeButton={false}
              render={<Link href="/signup" />}
            >
              Get Started
              <ArrowRight data-icon="inline-end" />
            </Button>
          </Show>
          <Button size="lg" variant="outline" className="gap-1.5" onClick={scrollToDemo}>
            <Play data-icon="inline-start" className="fill-current" />
            Watch Demo
          </Button>
        </div>
      </div>

      <div className="relative mx-auto mt-20 max-w-4xl">
        <DashboardMockup />

        <FloatingCard
          icon={Gauge}
          label="Resume Score"
          value="92 / 100"
          className="-top-8 -left-6 hidden sm:flex sm:-left-14"
        />
        <FloatingCard
          icon={FileCheck2}
          label="AI Fit Analysis"
          value="87% match"
          className="-top-8 -right-6 hidden sm:flex sm:-right-14"
        />
        <FloatingCard
          icon={PenLine}
          label="Cover Letter"
          value="Ready to review"
          className="-bottom-8 -left-6 hidden sm:flex sm:-left-14"
        />
        <FloatingCard
          icon={MessageSquareHeart}
          label="Interview Ready"
          value="5 talking points"
          className="-bottom-8 -right-6 hidden sm:flex sm:-right-14"
        />
      </div>
    </section>
  );
}

function FloatingCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  className: string;
}) {
  return (
    <div
      className={`absolute z-10 items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-left shadow-xl ring-1 ring-foreground/5 ${className}`}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/15">
        <Icon className="size-4" />
      </span>
      <span className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">{value}</span>
      </span>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="animate-in fade-in zoom-in-95 rounded-2xl border border-border bg-card p-2 shadow-2xl ring-1 ring-foreground/10 duration-1000">
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <span className="size-2.5 rounded-full bg-muted" />
        <span className="size-2.5 rounded-full bg-muted" />
        <span className="size-2.5 rounded-full bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-3 rounded-lg bg-muted/40 p-3 sm:grid-cols-3">
        <div className="flex flex-col justify-between gap-4 rounded-lg bg-card p-4 ring-1 ring-foreground/5 sm:col-span-1">
          <span className="text-xs text-muted-foreground">Resume Score</span>
          <span className="font-heading text-4xl font-semibold">92</span>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[92%] rounded-full bg-primary" />
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-lg bg-card p-4 ring-1 ring-foreground/5 sm:col-span-2">
          <span className="text-xs text-muted-foreground">Fit analysis</span>
          <div className="flex flex-1 items-end gap-2">
            {[40, 70, 55, 90, 65, 80].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-primary/70"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
        <div className="col-span-1 flex items-center gap-2 rounded-lg bg-card p-3 ring-1 ring-foreground/5 sm:col-span-3">
          {["Applied", "Interview", "Offer"].map((stage) => (
            <div key={stage} className="flex-1 rounded-md bg-muted/60 p-2 text-center">
              <span className="text-xs text-muted-foreground">{stage}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
