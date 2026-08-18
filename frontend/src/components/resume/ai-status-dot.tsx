"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/axios";

// Mirrors AiWarmup's ping but owns visible state — AiWarmup fires once,
// silently, from wherever the user first lands; this fires again
// specifically when the resume page mounts, so the dot reflects the
// CURRENT state rather than whatever page happened to load first. A
// repeat ping is cheap once warm (see /health/ai's rate limit), so
// checking twice costs nothing real.
//
// Deliberately two states, not three: a failed ping just stays
// "checking" rather than surfacing an alarming "unavailable" — this is
// ambient reassurance, not a status the user needs to act on. The
// upload flow itself already has honest error handling if something
// actually goes wrong at that point.
export function AiStatusDot() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ status: string }>("/health/ai")
      .then(({ data }) => {
        if (!cancelled && data.status === "ok") setIsReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-1">
      <p className="font-label text-xs font-bold tracking-widest text-muted-foreground uppercase">
        Assistant
      </p>
      <div className="flex items-center gap-1.5">
        <span
          className={`size-2 rounded-full ${
            isReady ? "bg-emerald-500" : "animate-pulse bg-purple"
          }`}
        />
        <span
          className={`text-sm ${isReady ? "text-muted-foreground" : "text-purple-dark"}`}
        >
          {isReady ? "Ready" : "Getting ready..."}
        </span>
      </div>
    </div>
  );
}
