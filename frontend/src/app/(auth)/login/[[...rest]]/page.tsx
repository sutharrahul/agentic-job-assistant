import { SignIn } from "@clerk/nextjs";

// Catch-all segment ([[...rest]]) is required by Clerk's <SignIn />: it
// routes its own multi-step flows (password, MFA, OAuth callback,
// password reset) as sub-paths under this route. Without it, every step
// after the first would 404.
//
// The route stays /login rather than Clerk's default /sign-in, which is
// why NEXT_PUBLIC_CLERK_SIGN_IN_URL is set in .env — that's how Clerk's
// redirects and the <SignUp /> link know where to point.
export default function LoginPage() {
  return <SignIn />;
}
