import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { WorkflowSection } from "@/components/landing/workflow";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <DashboardPreview />
        <WorkflowSection />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
