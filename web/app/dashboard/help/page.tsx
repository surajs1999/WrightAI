"use client";

import { useEffect, useState } from "react";

const CATEGORIES = [
  { id: "bug", label: "Bug Report" },
  { id: "feature", label: "Feature Request" },
  { id: "integration", label: "Integration Help" },
  { id: "billing", label: "Account & Billing" },
  { id: "general", label: "General Question" },
] as const;
type Category = (typeof CATEGORIES)[number]["id"];

const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
type Severity = (typeof SEVERITIES)[number];

const SEVERITY_DESC: Record<Severity, string> = {
  Low: "Minor inconvenience",
  Medium: "Feature not working",
  High: "Blocking my work",
  Critical: "Data loss / security",
};

const FEATURES = ["Generate", "Coverage", "Drift", "MCP Server", "GitHub Connect", "API / Keys", "Other"];

type Status = "idle" | "sending" | "sent" | "error";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  fontFamily: "var(--font-body)",
  fontSize: 14,
  padding: "10px 14px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 13,
  color: "var(--text)",
  display: "block",
  marginBottom: 8,
  fontWeight: 500,
};

const hintStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--text-muted)",
  marginTop: 5,
};

/**
 * Renders a help and support form component that allows users to submit bug reports, feature requests, or general questions with dynamic form fields based on the selected category.
 *
 * A React functional component that manages a multi-step support form with state for category selection (bug/feature/question), severity levels, subject, description, reproduction steps, affected features, and user email. The component automatically pre-fills the email from a cookie on mount, conditionally displays bug-specific fields (severity and steps to reproduce), handles form submission via POST to /api/support, and displays a success confirmation screen after submission. The form includes client-side validation, error handling, and a reset mechanism.
 * @returns {JSX.Element} A React element containing either a success confirmation view or a two-column layout with a support form on the left and informational sidebar on the right, styled with inline CSS using CSS variables.
 * @example
 * <HelpPage />
 */
export default function HelpPage() {
  const [category, setCategory] = useState<Category>("bug");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("Medium");
  const [steps, setSteps] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    try {
      const raw = document.cookie.split("; ").find(c => c.startsWith("wright_user="));
      if (raw) {
        const user = JSON.parse(decodeURIComponent(raw.split("=").slice(1).join("=")));
        if (user.email) setEmail(user.email);
      }
    } catch {}
  }, []);

  const toggleFeature = (f: string) =>
    setFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || !email.trim()) return;
    setStatus("sending");

    const payload = {
      category,
      subject: subject.trim(),
      description: description.trim(),
      email: email.trim(),
      ...(category === "bug" && { severity, steps: steps.trim() }),
      affected_features: features,
      meta: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        ts: new Date().toISOString(),
      },
    };

    try {
      // POST to backend if available; graceful fallback
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  };

  const reset = () => {
    setSubject(""); setDescription(""); setSteps(""); setFeatures([]);
    setSeverity("Medium"); setCategory("bug"); setStatus("idle");
  };

  if (status === "sent") {
    return (
      <div style={{ maxWidth: 560 }}>
        <div style={{
          background: "var(--surface)", border: "1px solid rgba(29,158,117,0.3)",
          borderRadius: 12, padding: "32px 28px", textAlign: "center",
        }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>✓</div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18, color: "var(--text)", marginBottom: 10 }}>
            We got your message
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 24 }}>
            Thanks for reaching out. We&apos;ll reply to <strong style={{ color: "var(--text)" }}>{email}</strong> as soon as possible — usually within 24 hours.
          </p>
          <button
            onClick={reset}
            style={{ padding: "9px 22px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: 14, cursor: "pointer" }}
          >
            Send another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 28, alignItems: "flex-start" }}>
      {/* Left — form */}
      <div>
      {/* Header */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px", marginBottom: 28 }}>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: "var(--text)" }}>Need help?</strong> Fill in the form and our team will get back to you.
          For bug reports, more detail helps us fix things faster.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>

        {/* Category */}
        <div>
          <span style={labelStyle}>What brings you here?</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                style={{
                  padding: "7px 16px", borderRadius: 999,
                  border: "1px solid var(--border)",
                  background: category === c.id ? "rgba(83,74,183,0.15)" : "transparent",
                  borderColor: category === c.id ? "rgba(83,74,183,0.4)" : "var(--border)",
                  color: category === c.id ? "var(--text)" : "var(--text-muted)",
                  fontFamily: "var(--font-body)", fontSize: 13,
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Severity — bug only */}
        {category === "bug" && (
          <div>
            <span style={labelStyle}>Severity</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SEVERITIES.map(s => {
                const active = severity === s;
                const accent = s === "Critical" ? "var(--red)" : s === "High" ? "var(--amber)" : s === "Medium" ? "var(--purple-light)" : "var(--green)";
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    style={{
                      padding: "7px 16px", borderRadius: 8,
                      border: `1px solid ${active ? accent : "var(--border)"}`,
                      background: active ? `color-mix(in srgb, ${accent} 12%, transparent)` : "transparent",
                      color: active ? accent : "var(--text-muted)",
                      fontFamily: "var(--font-body)", fontSize: 13,
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {s}
                    <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, marginTop: 2, opacity: 0.7 }}>{SEVERITY_DESC[s]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Subject */}
        <div>
          <label style={labelStyle} htmlFor="subject">Subject <span style={{ color: "var(--red)", fontWeight: 400 }}>*</span></label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder={
              category === "bug" ? "e.g. Coverage scan returns 500 on Python repos" :
              category === "feature" ? "e.g. Support for Ruby docstrings" :
              "Brief summary of your question"
            }
            style={inputStyle}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle} htmlFor="description">
            {category === "bug" ? "What happened?" : "Description"}{" "}
            <span style={{ color: "var(--red)", fontWeight: 400 }}>*</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={
              category === "bug"
                ? "Describe what you saw. Include any error messages."
                : category === "feature"
                ? "Describe the feature and why it would help you."
                : "Describe your question or concern in detail."
            }
            rows={5}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            required
          />
        </div>

        {/* Steps to reproduce — bug only */}
        {category === "bug" && (
          <div>
            <label style={labelStyle} htmlFor="steps">Steps to reproduce <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 12 }}>(optional)</span></label>
            <textarea
              id="steps"
              value={steps}
              onChange={e => setSteps(e.target.value)}
              placeholder={"1. Go to Coverage tab\n2. Select repo and click Run\n3. See error in console"}
              rows={4}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
            />
            <p style={hintStyle}>Numbered steps help us reproduce the issue faster.</p>
          </div>
        )}

        {/* Affected features */}
        <div>
          <span style={{ ...labelStyle, marginBottom: 10 }}>
            Affected feature(s) <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 12 }}>(optional)</span>
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {FEATURES.map(f => {
              const active = features.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFeature(f)}
                  style={{
                    padding: "5px 14px", borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: active ? "rgba(83,74,183,0.12)" : "transparent",
                    borderColor: active ? "rgba(83,74,183,0.35)" : "var(--border)",
                    color: active ? "var(--text)" : "var(--text-muted)",
                    fontFamily: "var(--font-mono)", fontSize: 12,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {active && <span style={{ marginRight: 5 }}>✓</span>}{f}
                </button>
              );
            })}
          </div>
        </div>

        {/* Email */}
        <div>
          <label style={labelStyle} htmlFor="email">
            Reply-to email <span style={{ color: "var(--red)", fontWeight: 400 }}>*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={inputStyle}
            required
          />
          <p style={hintStyle}>We&apos;ll reply here. Pre-filled from your account.</p>
        </div>

        {status === "error" && (
          <div style={{ padding: "10px 14px", background: "rgba(226,75,74,0.08)", border: "1px solid rgba(226,75,74,0.25)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--red)" }}>
            Something went wrong sending your message. Try again or email us directly.
          </div>
        )}

        {/* Submit */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="submit"
            disabled={status === "sending" || !subject.trim() || !description.trim() || !email.trim()}
            style={{
              padding: "10px 28px", background: "var(--purple)", color: "#fff",
              border: "none", borderRadius: 8, fontFamily: "var(--font-body)",
              fontWeight: 500, fontSize: 15,
              cursor: status === "sending" || !subject.trim() || !description.trim() || !email.trim() ? "not-allowed" : "pointer",
              opacity: !subject.trim() || !description.trim() || !email.trim() ? 0.5 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {status === "sending" ? "Sending…" : "Send message"}
          </button>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
            We aim to reply within 24 hours
          </span>
        </div>
      </form>
      </div>

      {/* Right — info sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 24 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 20px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Response time</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Bug reports", time: "< 24 hours" },
              { label: "Feature requests", time: "2–3 days" },
              { label: "General questions", time: "< 48 hours" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>{r.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--green)" }}>{r.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 20px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Tips for faster help</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Include the repo name and language",
              "Paste any error messages you see",
              "Mention which tool or feature is affected",
              "Add steps to reproduce for bugs",
            ].map((tip, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--purple-light)", flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
