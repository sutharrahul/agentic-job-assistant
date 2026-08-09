// Shown while a dashboard route segment is still rendering on the
// server. Without it the browser holds the previous page until the new
// one is ready, which on a sleeping free-tier backend looks like a click
// that did nothing — so people click again.
//
// Blocks rather than spinners: they occupy the space the real content
// will fill, so the layout doesn't jump when it arrives.
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-32 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
