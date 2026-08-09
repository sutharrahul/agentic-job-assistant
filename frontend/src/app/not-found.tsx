import Link from "next/link";
import { Button } from "@/components/ui/button";

// At the app root, so it covers both a mistyped URL and any notFound()
// call that isn't handled closer to the route. Next's default 404 is
// unstyled black-on-white, which next to the landing page reads as a
// broken deployment rather than a wrong address.
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">This page doesn&apos;t exist</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The link may be out of date, or the address might have a typo.
      </p>
      {/* Home rather than the dashboard: this renders for signed-out
          visitors too, and /dashboard would just bounce them to login. */}
      <Button nativeButton={false} render={<Link href="/" />}>
        Back to home
      </Button>
    </main>
  );
}
