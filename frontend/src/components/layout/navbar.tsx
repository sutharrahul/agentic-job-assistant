"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/resume", label: "Resume" },
  { href: "/applications", label: "Applications" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 font-heading font-semibold"
      >
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <span className="hidden lg:inline">Agentic Job Assistant</span>
      </Link>

      {/* Pill switcher — one nav design language across the whole app. */}
      <nav className="flex items-center gap-1 rounded-full border bg-background/60 p-1">
        {NAV_ITEMS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <ModeToggle />
        {/* Clerk's UserButton already provides the avatar, the account
            email, Manage account and Sign out. Only the link back to the
            landing page is ours, added as a custom menu item so there's
            still one menu rather than two. */}
        <UserButton>
          <UserButton.MenuItems>
            <UserButton.Link
              label="Landing page"
              labelIcon={<Home className="size-4" />}
              href="/"
            />
          </UserButton.MenuItems>
        </UserButton>
      </div>
    </header>
  );
}
