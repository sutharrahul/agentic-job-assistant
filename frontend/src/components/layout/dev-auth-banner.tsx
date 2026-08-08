"use client";

import { useAuth } from "@/lib/auth/auth-context";

// Renders nothing unless NEXT_PUBLIC_BYPASS_AUTH=true — a code comment is
// easy to miss while actually using the app, this isn't.
export function DevAuthBanner() {
  const { isBypassed } = useAuth();

  if (!isBypassed) return null;

  return (
    <div className="w-full bg-destructive px-4 py-1.5 text-center text-xs font-medium text-white">
      DEV MODE — auth is bypassed (NEXT_PUBLIC_BYPASS_AUTH=true). Not for
      production.
    </div>
  );
}
