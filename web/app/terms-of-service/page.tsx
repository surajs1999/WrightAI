import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/landing/Footer";

const LAST_UPDATED = "June 3, 2026";

export default function TermsOfServicePage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>

      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(6,4,15,0.92)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(175,169,236,0.08)",
        height: 60,
        display: "flex", alignItems: "center",
      }}>
        <div style={{ maxWidth: 1100, width: "100%", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            <Image src="/wright-logo.svg" alt="Wright AI" width={24} height={24} style={{ height: 24, width: "auto", opacity: 0.9 }} />
            <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15, color: "var(--text)", letterSpacing: "-0.02em" }}>
              Wright AI
            </span>
          </Link>
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)",
              textDecoration: "none", padding: "6px 14px", borderRadius: 7,
              border: "1px solid rgba(175,169,236,0.12)",
            }}
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px 120px" }}>

        {/* Hero */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 999,
            background: "rgba(83,74,183,0.1)", border: "1px solid rgba(127,119,221,0.2)",
            marginBottom: 20,
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#AFA9EC", letterSpacing: "0.08em" }}>Legal</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 40, color: "var(--text)", letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 16 }}>
            Terms of Service
          </h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7 }}>
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <div style={{ height: 1, background: "rgba(175,169,236,0.08)", marginBottom: 48 }} />

        <Section title="1. Acceptance of Terms">
          <P>By accessing or using Wright AI ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.</P>
          <P>These Terms apply to all users of Wright AI, including visitors, registered users, and paying subscribers. We reserve the right to update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</P>
        </Section>

        <Section title="2. Description of Service">
          <P>Wright AI is a documentation platform for software codebases. The Service includes:</P>
          <BulletList items={[
            "AI-powered documentation generation for TypeScript, JavaScript, Python, Go, Java, and Rust",
            "Coverage tracking and drift detection for existing documentation",
            "A VS Code extension, CLI tool, GitHub Action, and MCP server",
            "A web dashboard for managing projects and subscriptions",
            "llms.txt generation for AI-readable codebase indexes",
          ]} />
        </Section>

        <Section title="3. Accounts and Registration">
          <P>You must create an account to access certain features of the Service. You agree to provide accurate, current, and complete information and to keep your account credentials secure. You are responsible for all activity that occurs under your account.</P>
          <P>You must be at least 16 years old to use the Service. By registering, you represent that you meet this age requirement.</P>
        </Section>

        <Section title="4. Acceptable Use">
          <P>You agree not to use the Service to:</P>
          <BulletList items={[
            "Violate any applicable laws or regulations",
            "Infringe the intellectual property rights of others",
            "Upload or transmit malicious code, viruses, or harmful content",
            "Attempt to gain unauthorized access to the Service or its infrastructure",
            "Reverse-engineer, decompile, or otherwise attempt to extract the source code of the Service",
            "Resell or sublicense access to the Service without prior written consent",
            "Use automated tools to scrape or extract data from the Service beyond what is permitted by the API",
          ]} />
        </Section>

        <Section title="5. Your Content">
          <P>You retain ownership of all source code and documentation you submit to Wright AI. By using the Service, you grant Wright AI a limited, non-exclusive, worldwide license to process your code for the sole purpose of providing and improving the Service.</P>
          <P>Wright AI does not claim ownership over your code, generated documentation, or any output produced by the Service. You are responsible for ensuring you have the right to submit any code to the Service.</P>
          <P>Only function signatures and surrounding context windows are transmitted to our backend for documentation generation. Your full codebase is never stored on our servers. Coverage and structural drift checks run entirely locally.</P>
        </Section>

        <Section title="6. Subscription and Payment">
          <P>Some features require a paid subscription. Subscription fees are billed in advance on a monthly or annual basis, depending on your chosen plan. All fees are non-refundable except as described in our Refund Policy.</P>
          <P>We reserve the right to change subscription pricing. We will provide at least 30 days notice before any price increase takes effect for existing subscribers.</P>
        </Section>

        <Section title="7. Intellectual Property">
          <P>The Service, including its code, design, logos, and trademarks, is owned by Wright AI and protected by intellectual property laws. Nothing in these Terms grants you any rights to use Wright AI&apos;s trademarks, logos, or branding without express written permission.</P>
        </Section>

        <Section title="8. Disclaimer of Warranties">
          <P>The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. Wright AI does not warrant that the Service will be uninterrupted, error-free, or that generated documentation will be accurate or suitable for any particular purpose.</P>
        </Section>

        <Section title="9. Limitation of Liability">
          <P>To the fullest extent permitted by law, Wright AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service, including but not limited to loss of data, loss of profits, or business interruption.</P>
          <P>Our total liability for any claim arising out of or relating to these Terms or the Service shall not exceed the amount you paid to Wright AI in the 12 months preceding the claim.</P>
        </Section>

        <Section title="10. Termination">
          <P>You may cancel your account at any time. Wright AI may suspend or terminate your account if you violate these Terms, with or without notice depending on the severity of the violation.</P>
          <P>Upon termination, your right to use the Service ceases immediately. Provisions that by their nature should survive termination (including intellectual property, disclaimers, and limitations of liability) will do so.</P>
        </Section>

        <Section title="11. Governing Law">
          <P>These Terms are governed by and construed in accordance with applicable law. Any disputes arising from these Terms or the Service shall be resolved through binding arbitration, except where prohibited by law.</P>
        </Section>

        <Section title="12. Contact">
          <P>If you have questions about these Terms, please contact us at:</P>
          <div style={{
            marginTop: 16, padding: "20px 24px", borderRadius: 10,
            background: "rgba(83,74,183,0.07)", border: "1px solid rgba(127,119,221,0.15)",
          }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--text-muted)", lineHeight: 1.8, margin: 0 }}>
              Wright AI<br />
              <a href="mailto:hello@wrightai.live" style={{ color: "#AFA9EC", textDecoration: "none" }}>hello@wrightai.live</a>
            </p>
          </div>
        </Section>

        {/* Legal links */}
        <div style={{ marginTop: 56, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link href="/privacy-policy" style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)", textDecoration: "none" }}>
            Privacy Policy →
          </Link>
          <Link href="/refund-policy" style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)", textDecoration: "none" }}>
            Refund Policy →
          </Link>
        </div>

      </main>

      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{
        fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20,
        color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 14,
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--text-muted)", lineHeight: 1.8, margin: "10px 0" }}>
      {children}
    </p>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: "12px 0 12px 4px", display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ color: "#534AB7", fontSize: 18, lineHeight: "1.4", flexShrink: 0 }}>›</span>
          <span style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--text-muted)", lineHeight: 1.7 }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}
