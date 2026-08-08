"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/axios";
import { useAuthModal, type AuthModalTab } from "@/lib/auth/auth-modal-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { GoogleIcon } from "@/components/landing/brand-icons";

export function AuthModal() {
  const { isOpen, tab, setTab, closeModal } = useAuthModal();
  const [forgotPassword, setForgotPassword] = useState(false);

  function handleOpenChange(open: boolean) {
    if (!open) {
      closeModal();
      setForgotPassword(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {forgotPassword ? (
          <ForgotPasswordForm onBack={() => setForgotPassword(false)} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">
                {tab === "signin" ? "Welcome back" : "Create your account"}
              </DialogTitle>
              <DialogDescription>
                {tab === "signin"
                  ? "Log in to keep tracking your applications."
                  : "Start applying smarter in under a minute."}
              </DialogDescription>
            </DialogHeader>

            <Tabs value={tab} onValueChange={(value) => setTab(value as AuthModalTab)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="pt-4">
                <SignInForm onForgotPassword={() => setForgotPassword(true)} />
              </TabsContent>
              <TabsContent value="signup" className="pt-4">
                <SignUpForm />
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GoogleButton({ disabled }: { disabled?: boolean }) {
  async function handleGoogle() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) toast.error(error.message);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        disabled={disabled}
        onClick={handleGoogle}
      >
        <GoogleIcon className="size-4" />
        Continue with Google
      </Button>
      <div className="flex items-center gap-3 py-1">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">OR</span>
        <Separator className="flex-1" />
      </div>
    </>
  );
}

function SignInForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const router = useRouter();
  const { closeModal } = useAuthModal();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      setIsSubmitting(false);
      return;
    }

    await api.post("/users/sync");
    toast.success("Welcome back!");
    closeModal();
    router.push("/resume");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <GoogleButton disabled={isSubmitting} />
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">Password</Label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs text-muted-foreground underline-offset-3 hover:text-foreground hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <Input
          id="signin-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="remember-me"
          checked={rememberMe}
          onCheckedChange={(checked) => setRememberMe(checked === true)}
        />
        <Label htmlFor="remember-me" className="font-normal text-muted-foreground">
          Remember me
        </Label>
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {isSubmitting ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const router = useRouter();
  const { closeModal, setTab } = useAuthModal();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      toast.error(error.message);
      setIsSubmitting(false);
      return;
    }

    if (!data.session) {
      toast.success("Check your email to confirm your account.");
      setIsSubmitting(false);
      setTab("signin");
      return;
    }

    await api.post("/users/sync");
    toast.success("Account created!");
    closeModal();
    router.push("/resume");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <GoogleButton disabled={isSubmitting} />
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {isSubmitting ? "Creating account..." : "Sign Up"}
      </Button>
    </form>
  );
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });

    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSent(true);
    toast.success("Password reset email sent.");
  }

  return (
    <>
      <DialogHeader>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Back to sign in
        </button>
        <DialogTitle className="text-lg">Reset your password</DialogTitle>
        <DialogDescription>
          Enter your email and we&apos;ll send you a reset link.
        </DialogDescription>
      </DialogHeader>
      {sent ? (
        <p className="text-sm text-muted-foreground">
          Check <span className="font-medium text-foreground">{email}</span> for a
          link to reset your password.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {isSubmitting ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      )}
    </>
  );
}
