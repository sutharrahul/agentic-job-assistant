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
export function UserSync() {
  const { isLoaded, isSignedIn } = useAuth();
  // Once per mount, not once per render — without this, every re-render
  // while signed in would fire another request.
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasSynced.current) return;
    hasSynced.current = true;

    // Deliberately silent. This is a background repair step; if it
    // fails, the webhook still covers the normal path, and the user
    // shouldn't see an error for something they didn't do.
    api.post("/users/sync").catch(() => {});
  }, [isLoaded, isSignedIn]);

  return null;
}
