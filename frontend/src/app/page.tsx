import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { TechStack } from "@/components/landing/tech-stack";
import { Features } from "@/components/landing/features";
import { WorkflowSection } from "@/components/landing/workflow";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { WhyChoose } from "@/components/landing/why-choose";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <TechStack />
        <Features />
        <WorkflowSection />
        <DashboardPreview />
        <WhyChoose />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
