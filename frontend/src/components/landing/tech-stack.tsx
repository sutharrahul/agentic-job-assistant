import {
  Sparkles,
  Workflow,
  Database,
  Server,
  Triangle,
  Hexagon,
  Zap,
  Layers,
} from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

const STACK = [
  { icon: Sparkles, name: "Gemini" },
  { icon: Workflow, name: "LangGraph" },
  { icon: Database, name: "Supabase" },
  { icon: Server, name: "PostgreSQL" },
  { icon: Triangle, name: "Next.js" },
  { icon: Hexagon, name: "NestJS" },
  { icon: Zap, name: "FastAPI" },
  { icon: Layers, name: "Prisma" },
];

export function TechStack() {
  return (
    <section className="border-y border-border bg-muted/20 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <span className="font-label text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Trusted technologies
          </span>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STACK.map(({ icon: Icon, name }, i) => (
            <Reveal key={name} delay={i * 60}>
              <div className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-4 py-6 text-center transition-colors hover:border-foreground/20">
                <span className="flex size-9 items-center justify-center rounded-lg bg-secondary">
                  <Icon className="size-4.5" />
                </span>
                <span className="text-sm font-medium">{name}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
