import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/landing/Footer";

const LAST_UPDATED = "June 3, 2026";

export default function RefundPolicyPage() {
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
            Refund Policy
          </h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7 }}>
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <div style={{ height: 1, background: "rgba(175,169,236,0.08)", marginBottom: 48 }} />

        {/* Summary callout */}
        <div style={{
          padding: "20px 24px", borderRadius: 12, marginBottom: 40,
          background: "rgba(29,158,117,0.06)", border: "1px solid rgba(29,158,117,0.2)",
          borderLeft: "3px solid #1D9E75",
        }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--text-muted)", lineHeight: 1.75, margin: 0 }}>
            <strong style={{ color: "var(--text)" }}>Short version:</strong>{" "}We offer a 7-day money-back guarantee on all new paid subscriptions. If you&apos;re not satisfied within your first 7 days, contact us and we&apos;ll issue a full refund — no questions asked.
          </p>
        </div>

        <Section title="1. Free Plan">
          <P>Wright AI offers a free tier that includes the VS Code extension, CLI, and MCP server. No payment information is required and no charges apply to free plan users.</P>
        </Section>

        <Section title="2. 7-Day Money-Back Guarantee">
          <P>If you subscribe to a paid plan and are not satisfied with the Service for any reason, you may request a full refund within <strong style={{ color: "var(--text)" }}>7 days</strong> of your initial purchase date.</P>
          <P>To request a refund, email us at <a href="mailto:hello@wrightai.live" style={{ color: "#AFA9EC", textDecoration: "none" }}>hello@wrightai.live</a> with the subject line "Refund Request" and include your account email address. We will process your refund within 5–10 business days.</P>
          <P>The 7-day guarantee applies only to the first payment on a new subscription. It does not apply to subsequent renewals or plan upgrades.</P>
        </Section>

        <Section title="3. Renewals">
          <P>Subscriptions renew automatically at the end of each billing period (monthly or annually). We do not offer refunds for renewal charges unless the renewal occurred due to a billing error.</P>
          <P>To avoid being charged for a renewal, you must cancel your subscription at least 24 hours before your billing date. You can cancel at any time from the <Link href="/dashboard" style={{ color: "#AFA9EC", textDecoration: "none" }}>dashboard</Link> under Settings → Billing.</P>
        </Section>

        <Section title="4. Annual Plans">
          <P>Annual subscriptions are eligible for the 7-day money-back guarantee on the first payment. After the 7-day window, annual plans are non-refundable but you retain access to the Service for the remainder of your billing period.</P>
          <P>If you cancel an annual plan after 7 days, your subscription will remain active until the end of the paid period and will not auto-renew.</P>
        </Section>

        <Section title="5. Exceptional Circumstances">
          <P>Outside the 7-day window, we may grant refunds at our sole discretion in exceptional circumstances, such as:</P>
          <BulletList items={[
            "A billing error or duplicate charge on our part",
            "Extended service downtime that prevented you from using the product",
            "Extenuating personal circumstances reviewed on a case-by-case basis",
          ]} />
          <P>Requests for exceptional refunds are not guaranteed and will be evaluated individually.</P>
        </Section>

        <Section title="6. How Refunds Are Processed">
          <P>Refunds are returned to the original payment method used at the time of purchase. Processing times vary by payment provider but typically take 5–10 business days to appear on your statement.</P>
          <P>We use Paddle as our payment processor. For billing disputes or if you believe a charge is incorrect, you can also contact Paddle directly, though reaching out to us first will typically result in a faster resolution.</P>
        </Section>

        <Section title="7. Chargebacks">
          <P>If you initiate a chargeback through your bank or card provider without first contacting us, your account may be suspended pending resolution. We encourage you to contact us directly — most issues can be resolved quickly and we are happy to help.</P>
        </Section>

        <Section title="8. Contact">
          <P>For refund requests or billing questions, reach out to us at:</P>
          <div style={{
            marginTop: 16, padding: "20px 24px", borderRadius: 10,
            background: "rgba(83,74,183,0.07)", border: "1px solid rgba(127,119,221,0.15)",
          }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14.5, color: "var(--text-muted)", lineHeight: 1.8, margin: 0 }}>
              Wright AI<br />
              <a href="mailto:hello@wrightai.live" style={{ color: "#AFA9EC", textDecoration: "none" }}>hello@wrightai.live</a>
            </p>
          </div>
          <P>We typically respond to refund requests within one business day.</P>
        </Section>

        {/* Legal links */}
        <div style={{ marginTop: 56, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link href="/terms-of-service" style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)", textDecoration: "none" }}>
            Terms of Service →
          </Link>
          <Link href="/privacy-policy" style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-muted)", textDecoration: "none" }}>
            Privacy Policy →
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
