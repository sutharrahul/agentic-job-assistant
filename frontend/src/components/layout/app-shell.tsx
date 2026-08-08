import { Navbar } from "@/components/layout/navbar";
import { DevAuthBanner } from "@/components/layout/dev-auth-banner";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DevAuthBanner />
      <Navbar />
      {/* No sidebar: navigation lives in the Navbar's pill switcher, so
          content gets the full width. */}
      <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
