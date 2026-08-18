"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/axios";

// Fires GET /health/ai once per session, the moment any authenticated page
// mounts — before the user has picked a file or clicked anything that
// actually needs the AI service. It's a head start, not a guarantee: the
// resume upload flow still handles a cold AI service on its own (see
// resume-upload-form.tsx's retry cooldown), this just makes hitting that
// path less likely by giving Render's free-tier instance a few extra
// seconds to wake up while the user is still reading the page.
//
// No retry, unlike UserSync: a failed or slow ping still does its one
// job — starting the wake-up on Render's side — so there's nothing to
// gain from trying again, and nothing to show the user either way.
export function AiWarmup() {
  const { isLoaded, isSignedIn } = useAuth();
  const hasPinged = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasPinged.current) return;
    hasPinged.current = true;
    api.get("/health/ai").catch(() => {});
  }, [isLoaded, isSignedIn]);

  return null;
}
