import { MobileTopBar, Sidebar } from "@/components/layout/sidebar";
import { UserSync } from "@/components/user-sync";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Renders nothing — makes sure this user exists in our own
          database before any page below can reference them. See
          components/user-sync.tsx. */}
      <UserSync />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <MobileTopBar />
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
