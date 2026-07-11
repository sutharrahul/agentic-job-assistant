import { Sparkles, Lightbulb, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";

const APPLICATIONS = [
  { role: "Frontend Engineer", stage: "Interview", score: 91 },
  { role: "Full-Stack Developer", stage: "Applied", score: 84 },
  { role: "Product Engineer", stage: "Offer", score: 96 },
];

const SKILL_GAPS = [
  { skill: "TypeScript", value: 90 },
  { skill: "System Design", value: 65 },
  { skill: "GraphQL", value: 40 },
];

const SUGGESTIONS = [
  "Add measurable impact to your last role's bullet points.",
  "Highlight your LangGraph project — it matches this listing.",
  "Mention team size to strengthen leadership signals.",
];

const KANBAN = [
  { title: "Applied", items: ["Vercel", "Notion"] },
  { title: "Interview", items: ["Linear"] },
  { title: "Offer", items: ["Stripe"] },
];

export function DashboardPreview() {
  return (
    <section id="dashboard-preview" className="border-t border-border px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeading
            eyebrow="Dashboard"
            title="Your whole job search, in one view"
            description="A single dashboard for resume health, live applications, and AI-generated guidance."
          />
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-12 rounded-2xl border border-border bg-card p-2 shadow-xl ring-1 ring-foreground/10">
            <div className="flex items-center gap-1.5 px-3 py-2">
              <span className="size-2.5 rounded-full bg-muted" />
              <span className="size-2.5 rounded-full bg-muted" />
              <span className="size-2.5 rounded-full bg-muted" />
              <span className="ml-2 text-xs text-muted-foreground">
                dashboard.agenticjobassistant.app
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-xl bg-muted/30 p-3 lg:grid-cols-3">
              {/* Resume score */}
              <div className="flex flex-col justify-between gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Resume Score</span>
                  <TrendingUp className="size-4 text-muted-foreground" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="font-heading text-5xl font-semibold">87</span>
                  <span className="pb-1.5 text-sm text-muted-foreground">/ 100</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[87%] rounded-full bg-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Strong for Senior Frontend roles.
                </p>
              </div>

              {/* Skill gap chart */}
              <div className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/5 lg:col-span-2">
                <span className="text-sm font-medium">Skill Gap Analysis</span>
                <div className="flex flex-1 flex-col justify-center gap-3">
                  {SKILL_GAPS.map(({ skill, value }) => (
                    <div key={skill} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-xs text-muted-foreground">
                        {skill}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-foreground/80"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">
                        {value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kanban board */}
              <div className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/5 lg:col-span-2">
                <span className="text-sm font-medium">Applications Board</span>
                <div className="grid grid-cols-3 gap-2">
                  {KANBAN.map((col) => (
                    <div key={col.title} className="flex flex-col gap-2 rounded-lg bg-muted/50 p-2">
                      <span className="px-1 text-xs font-medium text-muted-foreground">
                        {col.title}
                      </span>
                      {col.items.map((item) => (
                        <div
                          key={item}
                          className="rounded-md bg-card px-2 py-1.5 text-xs ring-1 ring-foreground/5"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI suggestions */}
              <div className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/5">
                <div className="flex items-center gap-2">
                  <Lightbulb className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">AI Suggestions</span>
                </div>
                <ul className="flex flex-col gap-2">
                  {SUGGESTIONS.map((tip) => (
                    <li key={tip} className="flex gap-2 text-xs text-muted-foreground">
                      <Sparkles className="mt-0.5 size-3 shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recent applications */}
              <div className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/5 lg:col-span-3">
                <span className="text-sm font-medium">Recent Applications</span>
                <div className="flex flex-col divide-y divide-border">
                  {APPLICATIONS.map((app) => (
                    <div key={app.role} className="flex items-center justify-between py-2.5">
                      <span className="text-sm">{app.role}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          Fit {app.score}%
                        </span>
                        <Badge variant="outline">{app.stage}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
