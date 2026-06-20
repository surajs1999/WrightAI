"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/landing-v1/Footer";

const LAST_UPDATED = "June 3, 2026";

const SECTIONS = [
  "Introduction",
  "Information We Collect",
  "How We Use Your Information",
  "Data Minimization and Code Privacy",
  "Data Retention",
  "Third-Party Services",
  "Security",
  "Your Rights",
  "Children's Privacy",
  "Changes to This Policy",
  "Contact",
];

function toId(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function PrivacyPolicyPage() {
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState(toId(SECTIONS[0]));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach(title => {
      const el = document.getElementById(toId(title));
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveId(toId(title)); },
        { rootMargin: "-20% 0px -70% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>

      {/* Navbar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        height: 60,
        background: scrolled ? "rgba(8,6,18,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        transition: "all 0.3s ease",
        display: "flex", alignItems: "center",
      }}>
        <div style={{ maxWidth: 1200, width: "100%", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            <Image src="/wright-logo.svg" alt="Wright AI" width={36} height={36} style={{ height: 36, width: "auto" }} priority />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 17, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1 }}>Wright AI</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--purple-light)", letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.4 }}>Doc Intelligence</span>
            </div>
          </Link>
          <Link href="/dashboard" style={{ padding: "8px 18px", borderRadius: 8, background: "linear-gradient(135deg, #534AB7 0%, #7F77DD 100%)", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13.5, color: "#fff", textDecoration: "none", boxShadow: "0 4px 14px rgba(83,74,183,0.3)" }}>
            Start for free →
          </Link>
        </div>
      </div>

      {/* Layout */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 24px 0", display: "flex", gap: 0 }}>

        {/* Sidebar */}
        <aside style={{
          width: 220, flexShrink: 0,
          position: "sticky", top: 60,
          height: "calc(100vh - 60px)",
          overflowY: "auto",
          padding: "48px 0 48px",
          borderRight: "1px solid rgba(175,169,236,0.06)",
        }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "rgba(175,169,236,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, padding: "0 20px" }}>
            On this page
          </p>
          {SECTIONS.map((title, i) => {
            const id = toId(title);
            const isActive = activeId === id;
            return (
              <a
                key={id}
                href={`#${id}`}
                style={{
                  display: "block",
                  fontFamily: "var(--font-body)", fontSize: 13,
                  color: isActive ? "#AFA9EC" : "var(--text-muted)",
                  padding: "6px 20px",
                  textDecoration: "none",
                  borderLeft: isActive ? "2px solid #534AB7" : "2px solid transparent",
                  background: isActive ? "rgba(83,74,183,0.07)" : "transparent",
                  transition: "all 0.15s",
                  lineHeight: 1.4,
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
              >
                <span style={{ opacity: 0.4, fontFamily: "var(--font-mono)", fontSize: 10, marginRight: 6 }}>{String(i + 1).padStart(2, "0")}</span>
                {title}
              </a>
            );
          })}

          <div style={{ margin: "32px 20px 0", paddingTop: 24, borderTop: "1px solid rgba(175,169,236,0.07)" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "rgba(175,169,236,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Also see</p>
            {[{ label: "Terms of Service", href: "/terms-of-service" }, { label: "Refund Policy", href: "/refund-policy" }].map(l => (
              <Link key={l.href} href={l.href} style={{ display: "block", fontFamily: "var(--font-body)", fontSize: 12.5, color: "rgba(175,169,236,0.4)", textDecoration: "none", marginBottom: 8, transition: "color 0.15s" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#AFA9EC")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "rgba(175,169,236,0.4)")}
              >{l.label} →</Link>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0, padding: "48px 0 120px 56px", maxWidth: 720 }}>

          {/* Hero */}
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 999, background: "rgba(83,74,183,0.1)", border: "1px solid rgba(127,119,221,0.2)", marginBottom: 20 }}>
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
            <P>Wright AI (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.</P>
            <P>By using Wright AI, you agree to the collection and use of information as described in this policy.</P>
          </Section>

          <Section title="2. Information We Collect">
            <P><strong style={{ color: "var(--text)" }}>Account information:</strong> When you register, we collect your name, email address, and authentication credentials.</P>
            <P><strong style={{ color: "var(--text)" }}>Payment information:</strong> Billing details are processed and stored by our payment provider (Paddle). We do not store your full card number or payment credentials on our servers.</P>
            <P><strong style={{ color: "var(--text)" }}>Code context:</strong> When generating documentation, we transmit function signatures and a surrounding context window to our backend. We do not store your source code beyond what is required to fulfill the request.</P>
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
            <div style={{ marginTop: 16, padding: "20px 24px", borderRadius: 10, background: "rgba(83,74,183,0.07)", border: "1px solid rgba(127,119,221,0.15)" }}>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--text-muted)", lineHeight: 1.8, margin: 0 }}>
                Wright AI<br />
                <a href="mailto:hello@wrightai.live" style={{ color: "#AFA9EC", textDecoration: "none" }}>hello@wrightai.live</a>
              </p>
            </div>
          </Section>

        </main>
      </div>

      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const label = title.replace(/^\d+\.\s*/, "");
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return (
    <div id={id} style={{ marginBottom: 44, paddingTop: 8 }}>
      <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 20, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 14 }}>
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
