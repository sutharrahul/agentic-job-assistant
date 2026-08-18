import { MobileTopBar, Sidebar } from "@/components/layout/sidebar";
import { UserSync } from "@/components/user-sync";
import { AiWarmup } from "@/components/ai-warmup";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex overflow-hidden">
      {/* fixed + inset-0 rather than h-screen: pins this to the
          viewport regardless of body's own height, so body never grows
          past 100vh and gets its own scrollbar alongside main's — the
          two nested scrollbars the user was seeing stacked at the
          right edge. */}
      {/* Renders nothing — makes sure this user exists in our own
          database before any page below can reference them. See
          components/user-sync.tsx. */}
      <UserSync />
      {/* Also renders nothing — a background nudge to start waking the
          AI service's free-tier instance early. See ai-warmup.tsx. */}
      <AiWarmup />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <MobileTopBar />
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
