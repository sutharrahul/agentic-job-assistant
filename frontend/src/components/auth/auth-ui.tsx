import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Shared chrome for /login and /signup. The two screens are the same
// card with different copy, so the shell lives here rather than being
// kept in sync by hand in two files.
//
// Sizes are overridden off the app defaults on purpose: ui/input and
// ui/button are tuned for dense in-app forms (h-8), and these are the
// one place in the product that is a single roomy column a signed-out
// visitor reads before anything else.
const CONTROL = "h-11 w-full rounded-xl";

// Outline buttons default to bg-background, which is the page grey — on
// a white card that reads as a filled grey button rather than an
// outlined one. Dark mode keeps the variant's raised surface-3 fill,
// where a "white" card button would disappear instead.
const ON_CARD = "bg-card dark:bg-surface-3";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <div className="w-full rounded-3xl border bg-card p-8 shadow-card">
        <p className="font-label text-xs font-bold tracking-widest text-muted-foreground uppercase">
          A private workspace for your search
        </p>
        <h1 className="font-heading mt-3 text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        {children}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Your data is private and never used to auto-apply.
      </p>
    </div>
  );
}

export function AuthField({
  id,
  label,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { id: string; label: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-normal">
        {label}
      </Label>
      <Input id={id} className={cn(CONTROL, "px-4", className)} {...props} />
    </div>
  );
}

export function OrDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground">{children}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

// lucide-react ships no brand marks, so Google's is inline. Full colour
// rather than currentColor: a monochrome Google mark reads as a generic
// icon, and the whole value of the button is instant recognition.
export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.61l4.01 3.11C6.22 6.87 8.87 4.76 12 4.76Z"
      />
    </svg>
  );
}

export function GoogleButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn(CONTROL, ON_CARD, "gap-2.5")}
    >
      <GoogleIcon className="size-4" />
      {children}
    </Button>
  );
}

// Secondary routes through the flow ("Use another method", "Forgot
// password?"). A button, not a link: these switch a step in local state,
// they don't navigate, and a real <a> would break the back button.
export function AuthLink({
  onClick,
  disabled,
  className,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

// The one filled control on the screen, so it carries the brand accent.
export function AuthSubmit({
  disabled,
  children,
}: {
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="submit"
      disabled={disabled}
      className={cn(CONTROL, "bg-purple text-white hover:bg-purple-dark")}
    >
      {children}
    </Button>
  );
}

// Errors are rendered, never swallowed: a sign-in that silently does
// nothing is indistinguishable from a broken page.
export function FormError({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {children}
    </p>
  );
}

// The address the code went to, with a way back to change it — without
// this, a typo in the email means abandoning the tab.
export function SentToLine({
  email,
  onEdit,
}: {
  email: string;
  onEdit: () => void;
}) {
  return (
    <p className="flex items-center justify-center gap-2 text-sm break-all">
      {email}
      <button
        type="button"
        onClick={onEdit}
        aria-label="Use a different email address"
        className="shrink-0 text-muted-foreground transition-colors hover:text-purple"
      >
        <Pencil className="size-3.5" />
      </button>
    </p>
  );
}

// Codes expire and mail is slow, so resend has to exist — but an
// un-throttled resend button is a way to get the instance rate-limited,
// hence the countdown before it re-arms.
export function ResendLine({
  seconds,
  onResend,
  disabled,
}: {
  seconds: number;
  onResend: () => void;
  disabled?: boolean;
}) {
  if (seconds > 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Didn&apos;t receive a code? Resend ({seconds})
      </p>
    );
  }
  return (
    <div className="text-center">
      <AuthLink onClick={onResend} disabled={disabled}>
        Didn&apos;t receive a code? Resend
      </AuthLink>
    </div>
  );
}

// Counts down to zero and stops. Restarted by changing `key` on the
// component, so each newly sent code gets a fresh window.
export function useCountdown(from: number) {
  const [seconds, setSeconds] = useState(from);
  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);
  return [seconds, () => setSeconds(from)] as const;
}

export function AuthFooter({
  prompt,
  action,
  href,
}: {
  prompt: string;
  action: string;
  href: string;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{prompt}</span>
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href={href} />}
        className={cn("h-11 rounded-xl px-5", ON_CARD)}
      >
        {action}
      </Button>
    </div>
  );
}
