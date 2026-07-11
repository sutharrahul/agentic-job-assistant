import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";

const TESTIMONIALS = [
  {
    quote:
      "The skill-gap analysis alone saved me hours — I finally knew which projects to highlight for each role instead of guessing.",
    name: "Priya Menon",
    role: "Software Engineer",
    initials: "PM",
  },
  {
    quote:
      "As a final-year student applying everywhere, the fit score helped me stop wasting time on jobs I was never going to land.",
    name: "Daniel Osei",
    role: "Computer Science Student",
    initials: "DO",
  },
  {
    quote:
      "I use it to sanity-check candidates' resumes against our job posts before a first call. The gap breakdown is genuinely useful.",
    name: "Laura Fischer",
    role: "Technical Recruiter",
    initials: "LF",
  },
];

export function Testimonials() {
  return (
    <section className="px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeading eyebrow="Testimonials" title="What early users are saying" />
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map(({ quote, name, role, initials }, i) => (
            <Reveal key={name} delay={i * 100}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-4">
                  <Quote className="size-5 text-muted-foreground" />
                  <p className="flex-1 text-sm text-foreground">{quote}</p>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="size-3.5 fill-foreground text-foreground" />
                    ))}
                  </div>
                  <div className="flex items-center gap-3 border-t border-border pt-4">
                    <Avatar className="size-9">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{name}</span>
                      <span className="text-xs text-muted-foreground">{role}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
