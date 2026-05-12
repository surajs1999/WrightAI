import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ProblemStrip from "@/components/landing/ProblemStrip";
import FeatureScroll from "@/components/landing/FeatureScroll";
import InstallGrid from "@/components/landing/InstallGrid";
import DashboardPreview from "@/components/landing/DashboardPreview";
import FeedbackSection from "@/components/landing/FeedbackSection";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

/**
 * Renders the main landing page component containing all sections of the application homepage.
 *
 * This component serves as the primary landing page for the application, composing multiple child components (Navbar, Hero, ProblemStrip, FeatureScroll, InstallGrid, DashboardPreview, FeedbackSection, FinalCTA, and Footer) within a semantic main element to create a complete marketing page layout.
 * @returns {JSX.Element} A React element containing the complete landing page structure with all composed sections wrapped in a main element.
 * @example
 * <LandingPage />
 */
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
