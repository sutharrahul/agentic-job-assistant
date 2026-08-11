import { SignUp } from "@clerk/nextjs";
import { Lock } from "lucide-react";

// Catch-all segment for the same reason as the login route — see the
// comment in (auth)/login/[[...rest]]/page.tsx.
export default function SignupPage() {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <div className="w-full rounded-3xl border bg-card p-10 shadow-card">
        <p className="font-label text-xs font-bold tracking-widest text-muted-foreground uppercase">
          A private workspace for your search
        </p>
        <h1 className="mt-3 font-heading text-3xl font-bold">Create your account.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Start tracking applications in minutes.
        </p>
        <div className="mt-8">
          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "w-full max-w-none border-0 bg-transparent p-0 shadow-none",
                header: "hidden",
                socialButtonsBlockButton: "rounded-xl border",
                dividerText: "text-xs text-muted-foreground",
                formFieldLabel: "text-sm font-medium",
                formFieldInput: "rounded-xl border bg-background px-4 py-3",
                formButtonPrimary: "rounded-xl bg-purple hover:bg-purple-dark",
                footerActionLink: "text-purple hover:text-purple-dark",
              },
            }}
          />
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Your data is private and never used to auto-apply.
      </p>
    </div>
  );
}
