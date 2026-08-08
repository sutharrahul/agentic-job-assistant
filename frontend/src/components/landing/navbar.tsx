"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { useAuthModal } from "@/lib/auth/auth-modal-context";
import { useAuth } from "@/lib/auth/auth-context";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { openModal } = useAuthModal();
  const { isBypassed } = useAuth();
  const router = useRouter();

  // With NEXT_PUBLIC_BYPASS_AUTH on, there's no real Supabase project to
  // sign in against — go straight to the app instead of opening a modal
  // that can only fail.
  function handleAuthClick(tab: "signin" | "signup") {
    if (isBypassed) {
      router.push("/dashboard");
      return;
    }
    openModal(tab);
  }

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
          ? "h-14 border-border bg-background/80 backdrop-blur-md"
          : "h-16 border-transparent bg-background/60 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-heading font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="hidden sm:inline">Agentic Job Assistant</span>
          <span className="sm:hidden">AJA</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ModeToggle />
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" onClick={() => handleAuthClick("signin")}>
              Log in
            </Button>
            <Button onClick={() => handleAuthClick("signup")}>Get Started</Button>
          </div>

          <Sheet>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" className="md:hidden" />}
            >
              <Menu className="size-4" />
              <span className="sr-only">Open menu</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV_LINKS.map((link) => (
                  <SheetClose
                    key={link.href}
                    nativeButton={false}
                    render={
                      <a
                        href={link.href}
                        className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      />
                    }
                  >
                    {link.label}
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2 p-4">
                <SheetClose
                  render={<Button variant="outline" onClick={() => handleAuthClick("signin")} />}
                >
                  Log in
                </SheetClose>
                <SheetClose render={<Button onClick={() => handleAuthClick("signup")} />}>
                  Get Started
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
