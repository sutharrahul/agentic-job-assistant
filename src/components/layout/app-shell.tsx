import { Navbar } from "@/components/layout/navbar";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { DevAuthBanner } from "@/components/layout/dev-auth-banner";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DevAuthBanner />
      <Navbar />
      <div className="flex flex-1">
        {/* Persistent sidebar from md: up; below that, SidebarNav only
            appears inside Navbar's Sheet drawer (see navbar.tsx) — same
            component, two different containers, so nav items never drift
            out of sync between the mobile and desktop presentations. */}
        <aside className="hidden w-56 shrink-0 border-r md:block">
          <SidebarNav />
        </aside>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
