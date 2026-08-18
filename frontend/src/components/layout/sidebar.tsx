"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, KanbanSquare, LayoutDashboard, Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/mode-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/applications/new", label: "New application", icon: Plus },
  { href: "/applications", label: "Tracker", icon: KanbanSquare },
];

// Replaces the old top pill-switcher Navbar for every authenticated
// route. A permanent left rail rather than a header: the nav items
// (Dashboard/Resume/New application/Tracker) are places you go back to
// throughout a session, not a one-time page load — a sidebar keeps them
// one click away instead of scrolled out of view.
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-sidebar px-5 py-6 max-lg:hidden">
      <Link href="/" className="flex items-center gap-2 font-label text-sm font-bold">
        <Image src="/logo.webp" alt="" width={20} height={20} className="rounded-md" />
        Fitmark
      </Link>

      <nav className="mt-8 flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          // "New application" is an action link (always its own item),
          // everything else highlights on exact-or-nested match — so
          // /applications/[id] still shows Tracker as active.
          const active =
            href === "/applications/new"
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-card"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

// Companion to Sidebar for narrow viewports, where a permanent 240px
// rail would eat too much of the screen — a top bar with the same nav
// collapsed into a Sheet instead. Always in the DOM alongside Sidebar;
// which one is visible is CSS-only (lg:hidden / max-lg:hidden), so
// there's no client/server render mismatch from picking one in JS.
export function MobileTopBar() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between border-b bg-sidebar px-4 py-3 lg:hidden">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" size="icon" />}>
            <Menu className="size-4" />
            <span className="sr-only">Open menu</span>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/applications/new"
                    ? pathname === href
                    : pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <SheetClose
                    key={href}
                    nativeButton={false}
                    render={<Link href={href} />}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {label}
                  </SheetClose>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
        <Link href="/" className="flex items-center gap-2 font-label text-sm font-bold">
          <Image src="/logo.webp" alt="" width={20} height={20} className="rounded-md" />
          Fitmark
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <ModeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
