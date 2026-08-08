import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Next 16 renamed the `middleware` file convention to `proxy`. The file
// must export the handler either as a default export or as a named
// `proxy` export — Clerk's helper returns a handler, so it goes out as
// the default.
//
// createRouteMatcher takes path patterns rather than plain prefixes, so
// "(.*)"" is needed to cover nested routes like /applications/<id>.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/resume(.*)",
  "/applications(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  // Only guard the app routes. The landing page, sign-in and sign-up
  // pages must stay reachable while signed out, so this is an allowlist
  // of what to protect rather than a blanket protect().
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  // Without a matcher this runs on EVERY request including static assets
  // and image optimization, so auth logic would sit in front of CSS and
  // JS too. The negative lookahead skips _next internals and anything
  // that looks like a static file.
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
