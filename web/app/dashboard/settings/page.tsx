"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HelpCircle } from "lucide-react";

const STYLES = ["google", "numpy", "jsdoc", "epytext", "rust"];
const VERBOSITY = ["concise", "standard", "detailed"];

/**
 * Renders the settings page component with configuration options for documentation style, verbosity, examples, repository management, and account information.
 *
 * A React functional component that provides a user interface for managing application settings. The component displays a two-column layout with documentation style preferences (including style guide selection, verbosity level, and example inclusion toggle) and repository connections on the left, and account details with a help link on the right. On mount, it fetches the user's email from cookies and retrieves connected repositories from the API.
 * @returns {JSX.Element} A React element containing the settings page UI with interactive controls for style, verbosity, examples toggle, repository list, account information, and a save button.
 * @example
 * <SettingsPage />
 */
export default function SettingsPage() {
  const [style, setStyle] = useState("google");
  const [verbosity, setVerbosity] = useState("standard");
  const [examples, setExamples] = useState(true);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [repos, setRepos] = useState<{ id: string; name: string; branch: string }[]>([]);

  useEffect(() => {
    try {
      const raw = document.cookie.split("; ").find(c => c.startsWith("wright_user="));
      if (raw) {
        const user = JSON.parse(decodeURIComponent(raw.split("=").slice(1).join("=")));
         
        setEmail(user.email ?? null);
      }
    } catch {}

    fetch("/api/proxy/repos")
      .then(r => r.json())
      .then((data: { id: string; name: string; branch: string }[]) => {
        if (Array.isArray(data)) setRepos(data);
      })
      .catch(() => {});
  }, []);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 28, alignItems: "flex-start" }}>
      {/* Left column */}
      <div>
        {/* Doc style */}
        <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "22px 24px", marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 18 }}>
            Doc style
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text)", display: "block", marginBottom: 10, fontWeight: 500 }}>Style</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STYLES.map(s => (
                <button key={s} onClick={() => setStyle(s)} style={{ fontFamily: "var(--font-mono)", fontSize: 12, padding: "5px 14px", borderRadius: 999, border: "1px solid var(--border)", background: style === s ? "var(--purple-muted)" : "transparent", color: style === s ? "var(--text)" : "var(--text-muted)", cursor: "pointer" }}>{s}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text)", display: "block", marginBottom: 10, fontWeight: 500 }}>Verbosity</label>
            <div style={{ display: "flex", gap: 8 }}>
              {VERBOSITY.map(v => (
                <button key={v} onClick={() => setVerbosity(v)} style={{ fontFamily: "var(--font-mono)", fontSize: 12, padding: "5px 14px", borderRadius: 999, border: "1px solid var(--border)", background: verbosity === v ? "var(--purple-muted)" : "transparent", color: verbosity === v ? "var(--text)" : "var(--text-muted)", cursor: "pointer" }}>{v}</button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text)", fontWeight: 500 }}>Include examples</label>
            <button
              onClick={() => setExamples(e => !e)}
              style={{ width: 40, height: 22, borderRadius: 999, background: examples ? "var(--purple)" : "rgba(175,169,236,0.12)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
            >
              <span style={{ position: "absolute", top: 3, left: examples ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </button>
          </div>
        </section>

        {/* Repositories */}
        <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "22px 24px", marginBottom: 20 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
            Repositories
          </div>
          {repos.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {repos.map(r => (
                <div key={r.id} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text)" }}>{r.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{r.branch}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)", marginBottom: 14 }}>
              No repos connected yet.
            </p>
          )}
          <Link
            href="/dashboard"
            style={{ padding: "8px 18px", display: "inline-block", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}
          >
            Manage repos →
          </Link>
        </section>

        <button
          onClick={save}
          style={{ padding: "10px 28px", background: "var(--purple)", color: "#fff", border: "none", borderRadius: 8, fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 15, cursor: "pointer" }}
        >
          {saved ? "✓ Saved" : "Save settings"}
        </button>
      </div>

      {/* Right column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Account */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "22px 24px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
            Account
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Email</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text)", marginBottom: 16 }}>{email ?? "—"}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Plan</div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "3px 10px", borderRadius: 999, background: "rgba(83,74,183,0.12)", color: "var(--purple-light)", border: "1px solid rgba(83,74,183,0.2)", letterSpacing: "0.05em" }}>
            FREE PLAN
          </span>
        </div>

        {/* Need Help CTA */}
        <Link
          href="/dashboard/help"
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px", borderRadius: 12,
            background: "rgba(83,74,183,0.07)", border: "1px solid rgba(83,74,183,0.18)",
            textDecoration: "none", transition: "border-color 0.15s",
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(83,74,183,0.35)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(83,74,183,0.18)")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <HelpCircle size={18} color="var(--purple-light)" strokeWidth={1.8} />
            <div>
              <div style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 2 }}>
                Need Help?
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)" }}>
                Report a bug or ask a question
              </div>
            </div>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, color: "var(--purple-light)" }}>→</span>
        </Link>
      </div>
    </div>
  );
}
