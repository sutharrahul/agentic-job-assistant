"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { AuthenticateWithRedirectCallback, useSignIn } from "@clerk/nextjs";
import {
  AuthCard,
  AuthField,
  AuthFooter,
  AuthLink,
  AuthSubmit,
  FormError,
  GoogleButton,
  OrDivider,
  ResendLine,
  SentToLine,
  useCountdown,
} from "@/components/auth/auth-ui";
import { OtpInput } from "@/components/auth/otp-input";
import { AFTER_SIGN_IN, AFTER_SIGN_UP } from "@/lib/auth-redirects";
import { clerkErrorMessage } from "@/lib/clerk-error";

const RESEND_SECONDS = 30;

// Catch-all segment ([[...rest]]) is still required, but now for one
// reason rather than several: Google sends the browser back to
// /login/sso-callback, which has to resolve to a page. Every other step
// <SignIn /> used to route as a sub-path is a state in the machine
// below, so the URL stays /login throughout.
//
// The route is /login rather than Clerk's default /sign-in, which is why
// NEXT_PUBLIC_CLERK_SIGN_IN_URL is set in .env.
export default function LoginPage() {
  const params = useParams<{ rest?: string[] }>();

  if (params.rest?.[0] === "sso-callback") {
    return (
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl={AFTER_SIGN_IN}
        signUpFallbackRedirectUrl={AFTER_SIGN_UP}
      />
    );
  }

  return <SignInFlow />;
}

// Every screen this flow can be on. Modelled as one union rather than a
// pile of booleans so two screens can't be "on" at once, and so the
// compiler lists the cases when a new one is added.
type Step =
  | "identifier" // email + Google — the default way in
  | "email-code" // one-time code, the primary email method
  | "methods" // "use another method" fork
  | "password" // email + password
  | "device-code" // second factor after a correct password
  | "reset-code" // code proving you own the address, for a reset
  | "new-password"; // choose the replacement

export function SignInFlow() {
  // Clerk v7 hooks return the resource itself (null until Clerk loads)
  // rather than v6's `{ isLoaded, signIn, setActive }`, and its methods
  // resolve to `{ error }` instead of throwing.
  const { signIn } = useSignIn();

  const [step, setStep] = useState<Step>("identifier");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [resendIn, restartResend] = useCountdown(RESEND_SECONDS);

  const isReady = Boolean(signIn) && !isBusy;

  function go(next: Step) {
    setError(null);
    setCode("");
    setStep(next);
  }

  // Wraps the "call Clerk, show its error or carry on" shape every
  // handler below has, so no branch can forget to clear isBusy or to
  // surface an error — a sign-in button that silently does nothing is
  // the worst failure mode this screen has.
  async function run(
    action: () => Promise<{ error: unknown } | void>,
    fallback: string,
    onSuccess: () => void | Promise<void>,
  ) {
    if (!signIn || isBusy) return;
    setIsBusy(true);
    setError(null);
    try {
      const result = await action();
      const failure = result && "error" in result ? result.error : null;
      if (failure) {
        setError(clerkErrorMessage(failure, fallback));
        setIsBusy(false);
        return;
      }
      await onSuccess();
    } catch (err) {
      setError(clerkErrorMessage(err, fallback));
      setIsBusy(false);
    }
  }

  // Shared tail: turn a completed attempt into a real session.
  async function finish() {
    if (!signIn) return;
    if (signIn.status !== "complete") {
      setError("Sign-in didn't complete. Try another method.");
      setIsBusy(false);
      return;
    }
    // Navigating through finalize's own hook, with a HARD navigation
    // rather than router.push(). /dashboard is behind auth.protect() in
    // proxy.ts, and a client-side push races the session cookie: the
    // middleware evaluated the request before the cookie landed and
    // bounced straight back to /login?redirect_url=/dashboard, signed in
    // but on the wrong page. A full document request carries the cookie.
    // decorateUrl is Clerk's Safari ITP cookie-refresh wrapper.
    const finished = await signIn.finalize({
      navigate: ({ decorateUrl }) => {
        window.location.href = decorateUrl(AFTER_SIGN_IN);
      },
    });
    if (finished.error) {
      setError(clerkErrorMessage(finished.error, "Couldn't start your session."));
      setIsBusy(false);
    }
    // No setIsBusy(false) on success: the page is already navigating.
  }

  function sendEmailCode(next: Step) {
    return run(
      () => signIn!.emailCode.sendCode({ emailAddress: email }),
      "We couldn't find an account for that email. Create one below.",
      () => {
        restartResend();
        setIsBusy(false);
        go(next);
      },
    );
  }

  async function handleGoogle() {
    await run(
      () =>
        signIn!.sso({
          strategy: "oauth_google",
          redirectUrl: AFTER_SIGN_IN,
          redirectCallbackUrl: "/login/sso-callback",
        }),
      "Couldn't reach Google. Try again.",
      // On success the browser is already navigating away, so isBusy
      // deliberately stays true — the button must not re-arm mid-redirect.
      () => {},
    );
  }

  async function handlePassword(event: React.FormEvent) {
    event.preventDefault();
    await run(
      () => signIn!.password({ identifier: email, password }),
      "Couldn't sign you in. Check your details and try again.",
      async () => {
        if (signIn!.status === "complete") return finish();

        // A correct password isn't always the end of it: this instance
        // has Device Trust on, so the first sign-in from a given browser
        // comes back needing a code. <SignIn /> handled that internally;
        // dropping it means handling it here, or a correct password
        // dead-ends on every new browser.
        if (
          signIn!.status === "needs_client_trust" ||
          signIn!.status === "needs_second_factor"
        ) {
          const sent = await signIn!.mfa.sendEmailCode();
          if (sent.error) {
            setError(clerkErrorMessage(sent.error, "Couldn't send the code."));
            setIsBusy(false);
            return;
          }
          restartResend();
          setIsBusy(false);
          go("device-code");
          return;
        }

        setError("This account needs a step this form doesn't handle yet.");
        setIsBusy(false);
      },
    );
  }

  async function startReset() {
    await run(
      async () => {
        // resetPasswordEmailCode.sendCode() takes no identifier, so the
        // attempt has to be carrying one already. create() is cheap and
        // idempotent enough to just call; only sendCode's error matters.
        await signIn!.create({ identifier: email }).catch(() => undefined);
        return signIn!.resetPasswordEmailCode.sendCode();
      },
      "Couldn't send a reset code to that address.",
      () => {
        restartResend();
        setIsBusy(false);
        go("reset-code");
      },
    );
  }

  const verifyByStep: Record<string, (value: string) => Promise<void>> = {
    "email-code": (value) =>
      run(
        () => signIn!.emailCode.verifyCode({ code: value }),
        "That code wasn't right.",
        finish,
      ),
    "device-code": (value) =>
      run(
        () => signIn!.mfa.verifyEmailCode({ code: value }),
        "That code wasn't right.",
        finish,
      ),
    "reset-code": (value) =>
      run(
        () => signIn!.resetPasswordEmailCode.verifyCode({ code: value }),
        "That code wasn't right.",
        () => {
          setIsBusy(false);
          go("new-password");
        },
      ),
  };

  const resendByStep: Record<string, () => Promise<void>> = {
    "email-code": () =>
      run(() => signIn!.emailCode.sendCode({ emailAddress: email }), "Couldn't resend.", () => {
        restartResend();
        setIsBusy(false);
      }),
    "device-code": () =>
      run(() => signIn!.mfa.sendEmailCode(), "Couldn't resend.", () => {
        restartResend();
        setIsBusy(false);
      }),
    "reset-code": () =>
      run(() => signIn!.resetPasswordEmailCode.sendCode(), "Couldn't resend.", () => {
        restartResend();
        setIsBusy(false);
      }),
  };

  const footer = <AuthFooter prompt="New here?" action="Create account" href="/signup" />;

  // --- Step 1: who are you -------------------------------------------------
  if (step === "identifier") {
    return (
      <AuthCard title="Welcome back." subtitle="Pick up where you left off.">
        <div className="mt-8">
          <GoogleButton onClick={handleGoogle} disabled={!isReady}>
            Continue with Google
          </GoogleButton>

          <OrDivider>or use email</OrDivider>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendEmailCode("email-code");
            }}
            className="space-y-4"
          >
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
            <FormError>{error}</FormError>
            <AuthSubmit disabled={!isReady}>
              {isBusy ? "Sending code..." : "Continue"}
            </AuthSubmit>
          </form>

          <div className="mt-4 text-center">
            <AuthLink onClick={() => go("methods")} disabled={isBusy}>
              Use another method
            </AuthLink>
          </div>
        </div>
        {footer}
      </AuthCard>
    );
  }

  // --- Step 2: the code screens (three flows, one screen) ------------------
  if (step === "email-code" || step === "device-code" || step === "reset-code") {
    const subtitle =
      step === "device-code"
        ? "Confirm this device with the code we sent."
        : step === "reset-code"
          ? "Enter the code, then choose a new password."
          : "Enter the 6-digit code to sign in.";

    return (
      <AuthCard title="Check your email." subtitle={subtitle}>
        <div className="mt-6 space-y-6">
          <SentToLine email={email} onEdit={() => go("identifier")} />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void verifyByStep[step](code);
            }}
            className="space-y-5"
          >
            <OtpInput
              value={code}
              onChange={setCode}
              onComplete={(full) => void verifyByStep[step](full)}
              disabled={isBusy}
            />
            <FormError>{error}</FormError>
            <AuthSubmit disabled={!isReady || code.length < 6}>
              {isBusy ? "Verifying..." : "Verify OTP"}
            </AuthSubmit>
          </form>

          <ResendLine
            seconds={resendIn}
            onResend={() => void resendByStep[step]()}
            disabled={isBusy}
          />

          <div className="text-center">
            <AuthLink onClick={() => go("methods")} disabled={isBusy}>
              Use another method
            </AuthLink>
          </div>
        </div>
        {footer}
      </AuthCard>
    );
  }

  // --- The fork -------------------------------------------------------------
  if (step === "methods") {
    return (
      <AuthCard title="Use another method." subtitle="Choose how you want to continue.">
        <div className="mt-8 space-y-5">
          <AuthSubmitLike onClick={() => go("password")} disabled={isBusy}>
            Sign in with password
          </AuthSubmitLike>

          <OrDivider>or sign in with</OrDivider>

          <GoogleButton onClick={handleGoogle} disabled={!isReady}>
            Google
          </GoogleButton>

          <FormError>{error}</FormError>

          <div className="text-center">
            <AuthLink
              onClick={() => (email ? void sendEmailCode("email-code") : go("identifier"))}
              disabled={isBusy}
            >
              Use email code instead
            </AuthLink>
          </div>
        </div>
        {footer}
      </AuthCard>
    );
  }

  // --- Password -------------------------------------------------------------
  if (step === "password") {
    return (
      <AuthCard
        title="Sign in with password."
        subtitle="Use your email and password to continue."
      >
        <form onSubmit={handlePassword} className="mt-8 space-y-4">
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
            autoComplete="current-password"
            placeholder="At least 8 characters"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex justify-end">
            <AuthLink onClick={() => void startReset()} disabled={isBusy || !email}>
              Forgot password?
            </AuthLink>
          </div>
          <FormError>{error}</FormError>
          <AuthSubmit disabled={!isReady}>
            {isBusy ? "Signing in..." : "Sign in"}
          </AuthSubmit>
        </form>

        <div className="mt-4 text-center">
          <AuthLink onClick={() => go("methods")} disabled={isBusy}>
            Use another method
          </AuthLink>
        </div>
        {footer}
      </AuthCard>
    );
  }

  // --- New password ---------------------------------------------------------
  return (
    <AuthCard title="Choose a new password." subtitle="This replaces your old one.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(
            () => signIn!.resetPasswordEmailCode.submitPassword({ password }),
            "Couldn't set that password.",
            finish,
          );
        }}
        className="mt-8 space-y-4"
      >
        <AuthField
          id="password"
          label="New password"
          type="password"
          name="new-password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormError>{error}</FormError>
        <AuthSubmit disabled={!isReady}>
          {isBusy ? "Saving..." : "Set password and sign in"}
        </AuthSubmit>
      </form>
      {footer}
    </AuthCard>
  );
}

// Same weight as the submit button but not a submit — the methods screen
// picks a branch rather than sending a form.
function AuthSubmitLike({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-11 w-full rounded-xl bg-purple text-sm font-medium text-white transition-colors hover:bg-purple-dark disabled:pointer-events-none disabled:opacity-50"
    >
      {children}
    </button>
  );
}
