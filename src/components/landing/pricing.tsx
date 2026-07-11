"use client";

import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Reveal } from "@/components/landing/reveal";
import { SectionHeading } from "@/components/landing/section-heading";
import { useAuthModal } from "@/lib/auth/auth-modal-context";

const INCLUDED = [
  "Resume Analysis",
  "Cover Letter",
  "Kanban Tracking",
  "AI Suggestions",
];

export function Pricing() {
  const { openModal } = useAuthModal();

  return (
    <section id="pricing" className="border-t border-border px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <SectionHeading
            eyebrow="Pricing"
            title="One plan. Everything included."
            description="No tiers to compare, no feature gates — just the whole toolkit, free."
          />
        </Reveal>

        <Reveal delay={100}>
          <Card className="mx-auto mt-12 max-w-md border-2 border-foreground/10 shadow-xl">
            <CardHeader className="items-center gap-2 text-center">
              <Badge variant="secondary">
                <Sparkles data-icon="inline-start" />
                Free forever
              </Badge>
              <div className="flex items-end justify-center gap-1 pt-2">
                <span className="font-heading text-5xl font-semibold">$0</span>
                <span className="pb-1.5 text-sm text-muted-foreground">/ month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary">
                      <Check className="size-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button size="lg" className="w-full" onClick={() => openModal("signup")}>
                Get Started Free
              </Button>
            </CardFooter>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
