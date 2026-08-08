import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// This is the SERVER counterpart to client.ts — see the comment there
// for why both exist. This one reads/writes the Supabase session via
// this specific request's cookies (via next/headers), instead of the
// browser's storage.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Next.js only allows setting cookies from a Server Action or
          // Route Handler — NOT from a Server Component (which only
          // renders, it can't mutate the response). If this function is
          // ever called from a plain Server Component, cookieStore.set()
          // throws. We swallow that here because, in that case, a
          // middleware (once you add one) is expected to be the thing
          // that actually refreshes the session cookie instead.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Intentionally ignored — see comment above.
          }
        },
      },
    },
  );
}
