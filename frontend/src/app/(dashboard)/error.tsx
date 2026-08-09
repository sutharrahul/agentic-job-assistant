"use client"; // Error boundaries must be Client Components.

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Catches anything thrown while rendering a dashboard route. Without it,
// a render-time failure falls through to Next's built-in error screen,
// which in production says only "Application error: a client-side
// exception has occurred" on an unstyled page — indistinguishable, to
// whoever is looking at it, from the whole app being broken.
//
// It sits inside the (dashboard) group on purpose: this file replaces
// only the page, so AppShell and its navigation survive and there is
// still a way out that isn't the browser's back button.
//
// Note this does NOT catch failed API calls — those happen in event
// handlers and effects, after render. Each page handles its own (see the
// retry in resume/page.tsx and the toasts elsewhere); this is the net
// under genuine render bugs.
export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // No error-reporting service is wired up, so the console is the only
    // place the real cause survives — the UI below deliberately doesn't
    // show it, since a stack trace means nothing to the person reading.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        This page failed to load. Nothing you saved has been lost — trying
        again is usually enough.
      </p>
      {/* unstable_retry re-fetches and re-renders the segment, rather
          than reset()'s re-render of the same already-failed data. It
          landed in Next 16.2; this project is on 16.2.10. */}
      <Button variant="outline" onClick={() => unstable_retry()}>
        Try again
      </Button>
    </div>
  );
}
