import { UserCheck, ShieldCheck, Bot, Briefcase } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";

const REASONS = [
  {
    icon: UserCheck,
    title: "Human-in-the-loop AI",
    description:
      "The AI suggests, you decide. No auto-apply, no auto-edited resumes — every draft waits for your approval.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Resume Storage",
    description:
      "Your resume and personal data are encrypted at rest and never shared without consent.",
  },
  {
    icon: Bot,
    title: "Multi-Agent AI Pipeline",
    description:
      "Specialized agents handle parsing, matching, and writing — orchestrated end-to-end with LangGraph.",
  },
  {
    icon: Briefcase,
    title: "Built for Modern Hiring",
    description:
      "Designed around how engineers, students, and recruiters actually search and screen today.",
  },
];

export function WhyChoose() {
  return (
    <section className="border-t border-border bg-muted/20 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeading eyebrow="Why choose us" title="Built to earn your trust" />
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map(({ icon: Icon, title, description }, i) => (
            <Reveal key={title} delay={i * 90}>
              <Card className="h-full transition-shadow duration-300 hover:shadow-lg">
                <CardHeader>
                  <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
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
