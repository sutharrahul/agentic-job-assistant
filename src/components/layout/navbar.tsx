"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ModeToggle } from "@/components/mode-toggle";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useAuth } from "@/lib/auth/auth-context";

export function Navbar() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" className="md:hidden" />}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="p-4 pb-0">Agentic Job Assistant</SheetTitle>
          <SidebarNav onNavigate={() => setIsMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <Link href="/dashboard" className="font-semibold">
        Agentic Job Assistant
      </Link>

      <div className="ml-auto flex items-center gap-3">
        <ModeToggle />
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
