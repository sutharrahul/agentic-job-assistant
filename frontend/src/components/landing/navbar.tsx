"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

// Deliberately no nav links (Features/Workflow/FAQ used to live here) —
// this landing page's hero carries the primary conversion action itself
// ("Build an application"), so the nav's only job is utility for a
// returning user. Those sections are still reachable from the footer's
// Product links, just not competing for attention up here.
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  // useAuth() rather than <Show>: a hook returns synchronously with
  // isLoaded: false on the server and on the client's first render (the
  // same value in both, so hydration matches), THEN updates via a normal
  // re-render once Clerk resolves the real state client-side. <Show>
  // rendered nothing at all while loading, which is what stripped these
  // CTAs from the server HTML in the first place — this keeps that fix
  // (the fallback below IS what's now in the initial HTML) while also
  // no longer showing "Sign in" to someone who already is.
  const { isLoaded, isSignedIn } = useAuth();
  const showSignedIn = isLoaded && isSignedIn;

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 8);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-all duration-300 ${
        scrolled
          ? "h-14 border-border bg-background backdrop-blur-md"
          : "h-16 border-transparent bg-background/60 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-label text-sm font-bold">
          <span className="size-2 shrink-0 rounded-full bg-purple" />
          Agentic Job Assistant
        </Link>

        <div className="flex items-center gap-3">
          <span className="font-label hidden text-xs text-muted-foreground sm:inline">
            A calmer way to apply
          </span>
          <ModeToggle />
          {showSignedIn ? (
            <Button nativeButton={false} render={<Link href="/dashboard" />}>
              Dashboard
            </Button>
          ) : (
            <Button nativeButton={false} render={<Link href="/login" />}>
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
