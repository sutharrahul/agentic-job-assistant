"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthenticateWithRedirectCallback, useSignUp } from "@clerk/nextjs";
import {
  AuthCard,
  AuthField,
  AuthFooter,
  AuthSubmit,
  FormError,
  GoogleButton,
  OrDivider,
  ResendLine,
  SentToLine,
  useCountdown,
} from "@/components/auth/auth-ui";
import { OtpInput } from "@/components/auth/otp-input";
import { clerkErrorMessage } from "@/lib/clerk-error";

const AFTER_AUTH = "/resume";
const RESEND_SECONDS = 30;

// Catch-all segment for the same reason as the login route — see the
// comment in (auth)/login/[[...rest]]/page.tsx.
export default function SignupPage() {
  const params = useParams<{ rest?: string[] }>();

  if (params.rest?.[0] === "sso-callback") {
    return (
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl={AFTER_AUTH}
        signUpFallbackRedirectUrl={AFTER_AUTH}
      />
    );
  }

  return <SignUpForm />;
}

function SignUpForm() {
  const { signUp } = useSignUp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  // This instance verifies the address with an emailed code, so signing
  // up is genuinely two steps. Held in state rather than as a sub-route
  // because the code screen is meaningless without the in-memory signUp
  // attempt it belongs to — a refresh should send you back to the start.
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [resendIn, restartResend] = useCountdown(RESEND_SECONDS);

  const isReady = Boolean(signUp) && !isBusy;

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!signUp || isBusy) return;

    setIsBusy(true);
    setError(null);
    try {
      // Password is required on this instance, so it goes in with the
      // address rather than being collected after verification.
      const created = await signUp.password({ emailAddress: email, password });
      if (created.error) {
        setError(clerkErrorMessage(created.error, "Couldn't create that account."));
        return;
      }

      const sent = await signUp.verifications.sendEmailCode();
      if (sent.error) {
        setError(
          clerkErrorMessage(sent.error, "Couldn't send the verification code."),
        );
        return;
      }

      restartResend();
      setCode("");
      setNeedsCode(true);
    } catch (err) {
      setError(clerkErrorMessage(err, "Something went wrong. Try again."));
    } finally {
      setIsBusy(false);
    }
  }

  async function verify(value: string) {
    if (!signUp || isBusy) return;

    setIsBusy(true);
    setError(null);
    try {
      const verified = await signUp.verifications.verifyEmailCode({ code: value });
      if (verified.error) {
        setError(clerkErrorMessage(verified.error, "That code wasn't right."));
        setIsBusy(false);
        return;
      }

      if (signUp.status !== "complete") {
        setError("That code didn't finish the sign-up. Request a new one.");
        setIsBusy(false);
        return;
      }

      const finished = await signUp.finalize();
      if (finished.error) {
        setError(clerkErrorMessage(finished.error, "Couldn't start your session."));
        setIsBusy(false);
        return;
      }

      // No setIsBusy(false) past here: the component unmounts on
      // navigation, and setting state on the way out warns in React.
      router.push(AFTER_AUTH);
    } catch (err) {
      setError(clerkErrorMessage(err, "Something went wrong. Try again."));
      setIsBusy(false);
    }
  }

  async function resend() {
    if (!signUp || isBusy) return;
    setIsBusy(true);
    setError(null);
    try {
      const sent = await signUp.verifications.sendEmailCode();
      if (sent.error) {
        setError(clerkErrorMessage(sent.error, "Couldn't resend the code."));
      } else {
        restartResend();
      }
    } catch (err) {
      setError(clerkErrorMessage(err, "Couldn't resend the code."));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleGoogle() {
    if (!signUp || isBusy) return;

    setIsBusy(true);
    setError(null);
    try {
      const { error: ssoError } = await signUp.sso({
        strategy: "oauth_google",
        redirectUrl: AFTER_AUTH,
        redirectCallbackUrl: "/signup/sso-callback",
      });
      if (ssoError) {
        setError(clerkErrorMessage(ssoError, "Couldn't reach Google. Try again."));
        setIsBusy(false);
      }
      // On success the browser is already navigating away.
    } catch (err) {
      setError(clerkErrorMessage(err, "Couldn't reach Google. Try again."));
      setIsBusy(false);
    }
  }

  if (needsCode) {
    return (
      <AuthCard
        title="Check your email."
        subtitle="Enter the 6-digit code to confirm your address."
      >
        <div className="mt-6 space-y-6">
          <SentToLine email={email} onEdit={() => setNeedsCode(false)} />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void verify(code);
            }}
            className="space-y-5"
          >
            <OtpInput
              value={code}
              onChange={setCode}
              onComplete={(full) => void verify(full)}
              disabled={isBusy}
            />
            <FormError>{error}</FormError>
            <AuthSubmit disabled={!isReady || code.length < 6}>
              {isBusy ? "Verifying..." : "Verify OTP"}
            </AuthSubmit>
          </form>

          <ResendLine seconds={resendIn} onResend={() => void resend()} disabled={isBusy} />
        </div>

        <AuthFooter prompt="Already have an account?" action="Sign in" href="/login" />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account."
      subtitle="Start tracking applications in minutes."
    >
      <div className="mt-8">
        <GoogleButton onClick={handleGoogle} disabled={!isReady}>
          Continue with Google
        </GoogleButton>

        <OrDivider>or use email</OrDivider>

        <form onSubmit={handleCreate} className="space-y-4">
          <AuthField
            id="email"
            label="Email address"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="alex@youremail.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <AuthField
            id="password"
            label="Password"
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {/* Bot protection is enabled on this Clerk instance, and a
              custom flow has to say where the widget goes. Without this
              element the sign-up is rejected as an unverified request. */}
          <div id="clerk-captcha" />
          <FormError>{error}</FormError>
          <AuthSubmit disabled={!isReady}>
            {isBusy ? "Creating account..." : "Create account"}
          </AuthSubmit>
        </form>
      </div>

      <AuthFooter prompt="Already have an account?" action="Sign in" href="/login" />
    </AuthCard>
  );
}
