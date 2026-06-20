"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import NavbarV2 from "@/components/landing-v2/NavbarV2";
import FooterV2 from "@/components/landing-v2/FooterV2";

const LAST_UPDATED = "June 3, 2026";

const SECTIONS = [
  "Acceptance of Terms",
  "Description of Service",
  "Accounts and Registration",
  "Acceptable Use",
  "Your Content",
  "Subscription and Payment",
  "Intellectual Property",
  "Disclaimer of Warranties",
  "Limitation of Liability",
  "Termination",
  "Governing Law",
  "Contact",
];

function toId(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function TermsOfServicePage() {
  const [activeId, setActiveId] = useState(toId(SECTIONS[0]));

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
    <div style={{ minHeight: "100vh", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      {/* Background */}
      <div style={{ position: "absolute", top: "-15%", left: "50%", transform: "translateX(-50%)", width: 900, height: 600, background: "radial-gradient(ellipse, rgba(239,159,39,0.1) 0%, rgba(83,74,183,0.18) 45%, transparent 72%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(175,169,236,0.06) 1px, transparent 1px)", backgroundSize: "44px 44px", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 1 }}>

      <NavbarV2 />

      {/* Layout */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "72px 24px 0", display: "flex", gap: 0 }}>

        {/* Sidebar */}
        <aside style={{
          width: 220, flexShrink: 0,
          position: "sticky", top: 72,
          height: "calc(100vh - 72px)",
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
                  padding: "6px 20px 6px 20px",
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

          {/* Other legal docs */}
          <div style={{ margin: "32px 20px 0", paddingTop: 24, borderTop: "1px solid rgba(175,169,236,0.07)" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "rgba(175,169,236,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Also see</p>
            {[{ label: "Privacy Policy", href: "/privacy-policy" }, { label: "Refund Policy", href: "/refund-policy" }].map(l => (
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
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: "rgba(83,74,183,0.1)", border: "1px solid rgba(127,119,221,0.28)", marginBottom: 22 }}>
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#EF9F27", boxShadow: "0 0 8px #EF9F27" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--purple-light)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Legal</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 40, color: "var(--text)", letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 16 }}>
              <span style={{ background: "linear-gradient(135deg, var(--text) 0%, #EF9F27 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Terms of Service</span>
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
            <P>The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. Wright AI does not warrant that the Service will be uninterrupted, error-free, or that generated documentation will be accurate or suitable for any particular purpose.</P>
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
            <div style={{ marginTop: 16, padding: "20px 24px", borderRadius: 10, background: "rgba(83,74,183,0.07)", border: "1px solid rgba(127,119,221,0.15)" }}>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--text-muted)", lineHeight: 1.8, margin: 0 }}>
                Wright AI<br />
                <a href="mailto:hello@wrightai.live" style={{ color: "#AFA9EC", textDecoration: "none" }}>hello@wrightai.live</a>
              </p>
            </div>
          </Section>

        </main>
      </div>

      </div>
      <FooterV2 />
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
