"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Replaces Clerk's <UserButton>: same avatar image Clerk already
// generates (user.imageUrl — a real photo if uploaded, otherwise
// Clerk's own generated initial avatar), but a menu with only name,
// email, and sign out — no "Manage account" (opens Clerk's bundled
// UserProfile screen) and no "Secured by Clerk" branding.
export function UserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded || !user) return null;

  const name = user.fullName ?? user.firstName ?? "Account";
  const email = user.primaryEmailAddress?.emailAddress;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full outline-none">
        {/* eslint-disable-next-line @next/next/no-img-element -- external, unoptimizable Clerk-hosted avatar URL */}
        <img
          src={user.imageUrl}
          alt=""
          className="size-full object-cover"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-1.5 py-1.5">
          <p className="truncate text-sm font-medium">{name}</p>
          {email && (
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ redirectUrl: "/" })}>
          <LogOut data-icon="inline-start" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
