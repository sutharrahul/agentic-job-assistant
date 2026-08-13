import Link from "next/link";
import { GitHubIcon } from "@/components/landing/brand-icons";

export const GITHUB_URL = "https://github.com/sutharrahul/agentic-job-assistant";

// Only links that actually resolve. This is a portfolio project, so the
// Roadmap/Documentation/Changelog/Privacy/Terms entries that used to sit
// here were all href="#" placeholders promising pages that don't exist.
const FOOTER_LINKS = {
  Product: [
    { label: "Dashboard", href: "#dashboard-preview" },
    { label: "How it works", href: "#workflow" },
    { label: "FAQ", href: "#faq" },
  ],
  Project: [{ label: "GitHub", href: GITHUB_URL }],
};

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 flex flex-col gap-3 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-label text-sm font-bold">
              <span className="size-2 shrink-0 rounded-full bg-purple" />
              Agentic Job Assistant
            </Link>
            <p className="max-w-xs text-sm text-muted-foreground">
              AI-powered job search — you stay in control of every application.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <GitHubIcon className="size-5" />
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
          LangGraph, Gemini, PostgreSQL, Prisma and Supabase.
        </div>
      </div>
    </footer>
  );
}
