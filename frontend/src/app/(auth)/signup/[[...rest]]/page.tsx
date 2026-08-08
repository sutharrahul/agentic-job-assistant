import { SignUp } from "@clerk/nextjs";

// Catch-all segment for the same reason as the login route — see the
// comment in (auth)/login/[[...rest]]/page.tsx.
export default function SignupPage() {
  return <SignUp />;
}
