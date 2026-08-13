// Clerk v7's custom-flow methods RETURN `{ error }` instead of throwing,
// and that error carries two strings: `message` is written for
// developers, `longMessage` for the person at the keyboard ("Password is
// incorrect. Try again, or use another method."). Showing the wrong one
// is how a sign-in form ends up saying "Request failed with status 422".
//
// Takes `unknown` so the same call site handles both a returned Clerk
// error and anything thrown by a dropped connection, without casts.
export function clerkErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== "object" || error === null) return fallback;
  const { longMessage, message } = error as {
    longMessage?: unknown;
    message?: unknown;
  };
  if (typeof longMessage === "string" && longMessage) return longMessage;
  if (typeof message === "string" && message) return message;
  return fallback;
}
