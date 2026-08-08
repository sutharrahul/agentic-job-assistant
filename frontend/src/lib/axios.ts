import axios from "axios";
import { createClient } from "@/lib/supabase/client";

// `api` is the ONE axios instance the whole app should import — never
// call plain axios.get/post directly. That's what makes the interceptor
// below actually useful: every request made through `api` automatically
// gets the current user's auth token attached, so no component has to
// remember to do that itself.
//
// Timeout is set slightly ABOVE NestJS's own AI_REQUEST_TIMEOUT_MS
// (orchestration.module.ts, 120s) — so on a hung AI call, the backend's
// 504 with a real message reaches the browser first, instead of axios
// cutting the connection early with a generic ECONNABORTED.
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 130_000,
});

// An axios "request interceptor" is a function that runs on every
// outgoing request before it's sent, and gets to modify it. Here, we use
// that hook to read the current Supabase session and attach its token
// as an Authorization header — this is what NestJS's SupabaseAuthGuard
// verifies on the other end (see backend/src/auth/guards).
// Note: this uses the BROWSER Supabase client (see supabase/client.ts),
// so `api` only works correctly from Client Components — the browser
// client reads the session from the browser's own storage. A Server
// Component calling `api` wouldn't see the logged-in user's session.
api.interceptors.request.use(async (config) => {
  // DEV-ONLY AUTH BYPASS — mirrors backend's SupabaseAuthGuard (which
  // has its OWN separate BYPASS_AUTH check, not just trusting this).
  // There's no real Supabase session to fetch in bypass mode (auth was
  // never actually performed), so skip straight past the lookup below
  // rather than asking a possibly-fake/unconfigured Supabase project
  // for a session that doesn't exist.
  if (process.env.NEXT_PUBLIC_BYPASS_AUTH === "true") {
    return config;
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});
