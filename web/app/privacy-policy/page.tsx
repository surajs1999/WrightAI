import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/landing/Footer";

const LAST_UPDATED = "June 3, 2026";

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7 }}>
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <div style={{ height: 1, background: "rgba(175,169,236,0.08)", marginBottom: 48 }} />

        <Section title="1. Introduction">
          <P>Wright AI ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.</P>
          <P>By using Wright AI, you agree to the collection and use of information as described in this policy.</P>
        </Section>

        <Section title="2. Information We Collect">
          <P><strong style={{ color: "var(--text)" }}>Account information:</strong> When you register, we collect your name, email address, and authentication credentials.</P>
          <P><strong style={{ color: "var(--text)" }}>Payment information:</strong> Billing details are processed and stored by our payment provider (Paddle). We do not store your full card number or payment credentials on our servers.</P>
          <P><strong style={{ color: "var(--text)" }}>Code context:</strong> When generating documentation, we transmit function signatures and a surrounding context window to our backend. We do not store your source code beyond what is required to fulfill the request. Results are cached locally in SQLite on your machine — not on our servers.</P>
          <P><strong style={{ color: "var(--text)" }}>Usage data:</strong> We collect anonymized telemetry including feature usage, error logs, and performance metrics to improve the Service.</P>
          <P><strong style={{ color: "var(--text)" }}>Cookies:</strong> We use cookies and similar tracking technologies to maintain sessions and remember preferences. You can control cookies through your browser settings.</P>
        </Section>

        <Section title="3. How We Use Your Information">
          <P>We use the information we collect to:</P>
          <BulletList items={[
            "Provide, operate, and improve the Service",
            "Process transactions and send billing-related communications",
            "Send product updates, security alerts, and support messages",
            "Analyze usage patterns to improve features and fix bugs",
            "Comply with legal obligations",
          ]} />
          <P>We do not sell, rent, or share your personal data with third parties for marketing purposes.</P>
        </Section>

        <Section title="4. Data Minimization and Code Privacy">
          <P>Wright AI is designed with code privacy in mind:</P>
          <BulletList items={[
            "Only function signatures and a small context window are sent to our backend for doc generation — never your full source files",
            "Coverage and structural drift checks run entirely locally on your machine",
            "LLM drift results are cached in a local SQLite database; unchanged functions are never re-sent",
            "You can use the VS Code extension, CLI, and MCP server with zero data leaving your machine for coverage tracking",
          ]} />
        </Section>

        <Section title="5. Data Retention">
          <P>We retain your account information for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or compliance purposes.</P>
          <P>Anonymized usage analytics may be retained indefinitely as they cannot be linked back to any individual.</P>
        </Section>

        <Section title="6. Third-Party Services">
          <P>We use the following third-party services to operate Wright AI:</P>
          <BulletList items={[
            "Supabase — database and authentication",
            "Paddle — payment processing",
            "Anthropic / Google Cloud — AI inference for documentation generation",
            "Google Cloud Run — API hosting",
          ]} />
          <P>Each of these providers has their own privacy policy governing data they receive. We only share the minimum data necessary for each service to function.</P>
        </Section>

        <Section title="7. Security">
          <P>We implement industry-standard security measures including TLS encryption in transit, encrypted storage at rest, and access controls limiting who can view your data internally. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.</P>
        </Section>

        <Section title="8. Your Rights">
          <P>Depending on your jurisdiction, you may have the right to:</P>
          <BulletList items={[
            "Access the personal data we hold about you",
            "Request correction of inaccurate data",
            "Request deletion of your data",
            "Object to or restrict certain processing",
            "Data portability — receive your data in a machine-readable format",
          ]} />
          <P>To exercise any of these rights, contact us at the address below. We will respond within 30 days.</P>
        </Section>

        <Section title="9. Children's Privacy">
          <P>Wright AI is not directed at children under 16. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.</P>
        </Section>

        <Section title="10. Changes to This Policy">
          <P>We may update this Privacy Policy from time to time. We will notify you of material changes via email or a prominent notice on the Service. Continued use of the Service after the effective date of any changes constitutes acceptance of the updated policy.</P>
        </Section>

        <Section title="11. Contact">
          <P>For any privacy-related questions or requests, please contact us at:</P>
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
          <Link href="/terms-of-service" style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)", textDecoration: "none" }}>
            Terms of Service →
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
