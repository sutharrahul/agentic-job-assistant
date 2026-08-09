"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/axios";

// Guarantees this user has a row in OUR database before they can do
// anything that references it.
//
// Clerk's user.created webhook is the authoritative way that row gets
// created, but it's asynchronous — on a cold-started backend it can
// arrive seconds after the user is already clicking around. Without
// this, a brand-new user's first resume upload would fail the
// Resume.userId -> User.id foreign key.
//
// POST /users/sync is an idempotent upsert, so racing the webhook is
// harmless: whichever lands first wins and the other is a no-op.
// Spread out rather than tight, because the thing being waited on is a
// server waking from sleep (tens of seconds on a free tier), not a
// transient blip. A single immediate retry would land while the instance
// is still booting and fail for the same reason as the first attempt.
const RETRY_DELAYS_MS = [2_000, 5_000, 10_000];

export function UserSync() {
  const { isLoaded, isSignedIn } = useAuth();
  // Once per mount, not once per render — without this, every re-render
  // while signed in would fire another request.
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasSynced.current) return;
    hasSynced.current = true;

    // Cancels the retry chain if the component unmounts mid-wait, so a
    // user who signs out or navigates away doesn't leave timers firing
    // requests on behalf of a session that's gone.
    let cancelled = false;

    // Retried rather than fired once, because both halves of the race
    // this exists to settle lose at the same moment: on a cold start the
    // webhook is queued behind the same booting instance that just
    // rejected this request. One attempt at the worst possible time is
    // the case where a brand-new user's first upload fails the foreign
    // key — precisely what this component is here to prevent.
    //
    // Still deliberately silent. It's a background repair step; the user
    // didn't ask for it and shouldn't see it fail.
    async function sync() {
      for (let attempt = 0; ; attempt++) {
        try {
          await api.post("/users/sync");
          return;
        } catch {
          if (cancelled || attempt >= RETRY_DELAYS_MS.length) return;
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_DELAYS_MS[attempt]),
          );
          if (cancelled) return;
        }
      }
    }

    void sync();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  return null;
}
