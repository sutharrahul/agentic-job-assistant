import { Navbar } from "@/components/layout/navbar";
import { UserSync } from "@/components/user-sync";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Renders nothing — makes sure this user exists in our own
          database before any page below can reference them. See
          components/user-sync.tsx. */}
      <UserSync />
      <Navbar />
      {/* No sidebar: navigation lives in the Navbar's pill switcher, so
          content gets the full width. */}
      <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
