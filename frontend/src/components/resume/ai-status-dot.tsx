"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/axios";

type Status = "checking" | "ready" | "hidden";

// Mirrors AiWarmup's ping but owns visible state — AiWarmup fires once,
// silently, from wherever the user first lands; this fires again
// specifically when the resume page mounts, so the dot reflects the
// CURRENT state rather than whatever page happened to load first. A
// repeat ping is cheap once warm (see /health/ai's rate limit), so
// checking twice costs nothing real.
export function AiStatusDot() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ status: string }>("/health/ai")
      .then(({ data }) => {
        if (!cancelled) setStatus(data.status === "ok" ? "ready" : "hidden");
      })
      .catch(() => {
        // A rejected promise settles fast — an ad blocker or privacy
        // extension flagging this request, a network error, CORS —
        // unlike a genuinely slow cold start, which stays PENDING and
        // never reaches this catch at all. So hiding here specifically
        // targets "this failed," not "this is still warming up," and
        // stops a blocked request from looking permanently stuck rather
        // than just quietly not being there. See the actual case this
        // fixes: Brave Shields blocking /health/ai outright, which
        // previously left the dot reading "Getting ready..." forever
        // with the old silent no-op catch.
        if (!cancelled) setStatus("hidden");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "hidden") return null;

  const isReady = status === "ready";
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
