// Why there are TWO createClient() functions (this file and server.ts):
// Next.js App Router code can run in two very different places — in the
// user's browser (Client Components) or on the server, per-request
// (Server Components, Route Handlers). Each needs a differently
// configured Supabase client because they store the session differently
// (browser storage vs. that request's cookies), so @supabase/ssr gives
// us two separate constructor functions. Always import from the file
// that matches where your code runs.
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
