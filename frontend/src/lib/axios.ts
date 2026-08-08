import axios from "axios";
import { getToken } from "@clerk/nextjs";

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
// outgoing request before it's sent, and gets to modify it. Here it
// reads the current Clerk session token and attaches it as a Bearer
// header — which is what NestJS's ClerkAuthGuard verifies on the other
// end (see backend/src/auth/guards/clerk-auth.guard.ts).
//
// Clerk's standalone getToken() is used rather than the useAuth() hook
// because interceptors are plain functions outside the React tree and
// can't call hooks. It's built for this: it waits for Clerk to finish
// initializing, so a request fired during page load doesn't silently go
// out unauthenticated just because Clerk hadn't booted yet.
//
// Browser-only: it throws outside a browser, so `api` is for Client
// Components. A Server Component calling it would send no token.
api.interceptors.request.use(async (config) => {
  try {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Clerk failed to load, or the browser is offline. Send the request
    // anyway and let the backend answer with a 401 — that path is
    // already handled, and swallowing it here keeps one dead network
    // from turning into an unhandled rejection on every call.
  }

  return config;
});
