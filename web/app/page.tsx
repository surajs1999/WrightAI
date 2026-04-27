import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ProblemStrip from "@/components/landing/ProblemStrip";
import FeatureScroll from "@/components/landing/FeatureScroll";
import InstallGrid from "@/components/landing/InstallGrid";
import DashboardPreview from "@/components/landing/DashboardPreview";
import FeedbackSection from "@/components/landing/FeedbackSection";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ProblemStrip />
      <FeatureScroll />
      <InstallGrid />
      <DashboardPreview />
      <FeedbackSection />
      <FinalCTA />
      <Footer />
    </main>
  );
}
