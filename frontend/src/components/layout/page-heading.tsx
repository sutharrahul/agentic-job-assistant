import { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { ModeToggle } from "@/components/mode-toggle";

// Shared header for every dashboard-group page: a mono breadcrumb trail,
// a large heading, and an optional right-side action (a button, a status
// pill, whatever the page needs). One component so the breadcrumb/title
// rhythm stays identical across Dashboard, Resume, Applications, etc.
// instead of six pages hand-rolling a slightly different header each.
export function PageHeading({
  crumbs,
  title,
  action,
}: {
  crumbs: string[];
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b px-4 py-5 sm:px-6 lg:px-8">
      <div>
        <p className="font-label text-xs font-bold tracking-widest text-muted-foreground uppercase">
          {crumbs.join(" / ")}
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {action}
        {/* Theme toggle and avatar — used to live pinned to the
            sidebar's bottom; moved up here so the same chrome is
            reachable from the top of every page instead of scrolled out
            of view. Desktop-only: the mobile top bar has its own. */}
        <span className="max-lg:hidden">
          <ModeToggle />
        </span>
        <span className="max-lg:hidden">
          <UserButton>
            <UserButton.MenuItems>
              <UserButton.Link
                label="Landing page"
                labelIcon={<Sparkles className="size-4" />}
                href="/"
              />
            </UserButton.MenuItems>
          </UserButton>
        </span>
      </div>
    </div>
  );
}
