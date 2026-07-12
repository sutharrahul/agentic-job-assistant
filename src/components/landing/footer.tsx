import Link from "next/link";
import { Sparkles } from "lucide-react";
import { GitHubIcon, LinkedInIcon } from "@/components/landing/brand-icons";

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Roadmap", href: "#" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "GitHub", href: "#" },
    { label: "Changelog", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms", href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 flex flex-col gap-3 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-heading font-semibold">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="size-4" />
              </span>
              Agentic Job Assistant
            </Link>
            <p className="max-w-xs text-sm text-muted-foreground">
              AI-powered job search — you stay in control of every application.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="#"
                aria-label="GitHub"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <GitHubIcon className="size-5" />
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <LinkedInIcon className="size-5" />
              </a>
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading} className="flex flex-col gap-3">
              <span className="text-sm font-medium">{heading}</span>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © 2026 Agentic Job Assistant. Built with Next.js, NestJS, FastAPI,
          LangGraph, Gemini, and Supabase.
        </div>
      </div>
    </footer>
  );
}
