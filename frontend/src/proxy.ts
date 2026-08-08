import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/resume", "/applications"];

// DEV-ONLY AUTH BYPASS — see src/lib/auth/auth-context.tsx for the full
// explanation. When on, this skips the redirect-to-login check entirely
// (no session lookup happens at all), so protected routes render freely.
// MUST be "false" or unset in any shared/deployed environment.
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

export async function proxy(request: NextRequest) {
  if (BYPASS_AUTH) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  // A third Supabase client variant, alongside client.ts/server.ts —
  // this one runs in Proxy (Next.js 16's renamed "middleware": same
  // thing, runs before any route renders — see
  // node_modules/next/dist/docs/.../proxy.md, this project's Next
  // version is new enough that "middleware.ts" is deprecated). Its job
  // here is twofold: refresh the session cookie if the access token is
  // close to expiring (so a Server Component reading cookies later in
  // the request sees a valid session), and gate access to protected
  // routes.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  if (!user && isProtectedRoute) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets and Next's internals —
    // those never need auth checks and re-running middleware on every
    // image/font request would just be wasted latency.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
