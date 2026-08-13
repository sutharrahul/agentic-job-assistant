import { CalendarClock, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";

// Everything below mirrors what the real dashboard actually renders
// (app/(dashboard)/dashboard/page.tsx): four stat cards, a pipeline bar,
// upcoming interviews and recent applications. The previous mock invented
// a Resume Score, percentage-based skill gaps, an AI Suggestions panel and
// an inline kanban — none of which exist — which promised a product the
// app doesn't ship. Keep this in step when the dashboard changes.
const STATS = [
  { label: "Active applications", value: "12", caption: "3 added this week" },
  { label: "Interview stage", value: "03", caption: "Updated moments ago" },
  { label: "Average fit score", value: "84 / 100", caption: "Across 9 scored" },
  { label: "Follow-ups due", value: "02", caption: "Older than 7 days" },
];

// Same four statuses and the same stacked-bar treatment as the real
// pipeline, including its dot colours.
const PIPELINE = [
  { status: "Applied", count: 6, color: "bg-sky-500" },
  { status: "Interview", count: 3, color: "bg-amber-500" },
  { status: "Offer", count: 2, color: "bg-emerald-500" },
  { status: "Rejected", count: 1, color: "bg-rose-400" },
];

const TOTAL = PIPELINE.reduce((sum, s) => sum + s.count, 0);

const UPCOMING = [
  {
    role: "Frontend Engineer",
    meta: "Northwind · Round 1 · Technical · Online",
    when: "Aug 15, 10:00 AM",
  },
  {
    role: "Full-Stack Developer",
    meta: "Binc · Round 2 · System design · In-person",
    when: "Aug 18, 2:30 PM",
  },
];

const RECENT = [
  { role: "Frontend Engineer", company: "Northwind", fit: 91, stage: "Interview" },
  { role: "Full-Stack Developer", company: "Binc", fit: 84, stage: "Applied" },
  { role: "Product Engineer", company: "Kestrel", fit: 96, stage: "Offer" },
];

export function DashboardPreview() {
  return (
    <section id="dashboard-preview" className="border-t border-border px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeading
            eyebrow="Dashboard"
            title="Your whole job search, in one view"
            description="Where every application stands, what needs a follow-up, and which interview is next."
          />
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-12 rounded-2xl border border-border bg-card p-3 shadow-xl ring-1 ring-foreground/10 sm:p-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="rounded-xl bg-surface-2 p-4">
                  <p className="font-label text-xs tracking-widest text-muted-foreground uppercase">
                    {stat.label}
                  </p>
                  <p className="font-heading mt-2 text-2xl font-bold tracking-tight">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.caption}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-xl bg-surface-2 p-4">
                <p className="font-label text-xs tracking-widest text-muted-foreground uppercase">
                  Pipeline
                </p>
                <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-muted">
                  {PIPELINE.map((s) => (
                    <div
                      key={s.status}
                      className={s.color}
                      style={{ width: `${(s.count / TOTAL) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {PIPELINE.map((s) => (
                    <span key={s.status} className="flex items-center gap-1.5">
                      <span className={`size-1.5 rounded-full ${s.color}`} />
                      {s.status}{" "}
                      <span className="font-medium text-foreground">{s.count}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-start gap-2 border-t border-border pt-3">
                  <Clock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground">Product Engineer</span> at
                    Kestrel has had no reply for 9 days.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-surface-2 p-4">
                <p className="font-label text-xs tracking-widest text-muted-foreground uppercase">
                  Upcoming interviews
                </p>
                <div className="mt-3 space-y-2">
                  {UPCOMING.map((item) => (
                    <div
                      key={item.role}
                      className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-lg bg-card px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{item.role}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.meta}
                        </p>
                      </div>
                      <span className="font-label flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <CalendarClock className="size-3" />
                        {item.when}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-xl bg-surface-2 p-4">
              <p className="font-label text-xs tracking-widest text-muted-foreground uppercase">
                Recent applications
              </p>
              <div className="mt-3 space-y-1">
                {RECENT.map((app) => (
                  <div
                    key={app.role}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-card px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{app.company}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {app.role}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-label text-xs text-muted-foreground">
                        {app.fit} fit
                      </span>
                      <Badge variant="secondary">{app.stage}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
