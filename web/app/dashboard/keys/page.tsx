"use client";

import { useEffect, useState } from "react";

export default function KeysPage() {
  const [realKey, setRealKey] = useState<string>("");
  const [masked, setMasked] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    fetch("/api/auth/key")
      .then(r => r.json())
      .then(d => {
        setRealKey(d.key ?? "");
        setMasked(d.masked ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copy = () => {
    if (!realKey) return;
    navigator.clipboard.writeText(realKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: 860, display: "grid", gridTemplateColumns: "1fr 260px", gap: 24, alignItems: "flex-start" }}>

      {/* Main */}
      <div>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18, color: "var(--text)", marginBottom: 4 }}>API Key</h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Use this key to authenticate the VS Code extension, CLI, and MCP server.
          </p>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>

          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr auto auto", borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.2)", padding: "0 4px" }}>
            {["Status", "Key", "", ""].map((h, i) => (
              <div key={i} style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(175,169,236,0.45)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: "32px 20px", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
              Loading…
            </div>
          ) : !realKey ? (
            <div style={{ padding: "32px 20px", textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)" }}>
                No key found. Try signing out and back in.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr auto auto", alignItems: "center", padding: "0 4px" }}>

              {/* Status */}
              <div style={{ padding: "16px 14px" }}>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9,
                  padding: "3px 9px", borderRadius: 999,
                  background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.25)",
                  color: "var(--green)", letterSpacing: "0.06em", textTransform: "uppercase",
                }}>Active</span>
              </div>

              {/* Key display */}
              <div style={{ padding: "16px 14px" }}>
                <code style={{
                  fontFamily: "var(--font-mono)", fontSize: 12.5,
                  color: "var(--text-code)",
                  background: "rgba(175,169,236,0.06)",
                  border: "1px solid rgba(175,169,236,0.1)",
                  borderRadius: 6, padding: "5px 12px",
                  letterSpacing: "0.04em", wordBreak: "break-all",
                }}>
                  {revealed ? realKey : masked}
                </code>
              </div>

              {/* Reveal/Hide */}
              <div style={{ padding: "16px 8px" }}>
                <button
                  onClick={() => setRevealed(r => !r)}
                  style={{
                    padding: "5px 12px", background: "transparent",
                    border: "1px solid var(--border)", borderRadius: 6,
                    fontFamily: "var(--font-mono)", fontSize: 11,
                    color: "var(--text-muted)", cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {revealed ? "Hide" : "Reveal"}
                </button>
              </div>

              {/* Copy */}
              <div style={{ padding: "16px 14px" }}>
                <button
                  onClick={copy}
                  style={{
                    padding: "5px 14px", background: copied ? "rgba(29,158,117,0.15)" : "var(--purple)",
                    border: copied ? "1px solid rgba(29,158,117,0.4)" : "none",
                    borderRadius: 6,
                    fontFamily: "var(--font-mono)", fontSize: 11,
                    color: copied ? "var(--green)" : "#fff",
                    cursor: "pointer", transition: "all 0.2s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>

            </div>
          )}
        </div>

        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginTop: 12 }}>
          Pass via <code style={{ color: "var(--text-code)", background: "rgba(175,169,236,0.07)", padding: "1px 6px", borderRadius: 4 }}>X-Wright-API-Key</code> header or <code style={{ color: "var(--text-code)", background: "rgba(175,169,236,0.07)", padding: "1px 6px", borderRadius: 4 }}>?api_key=</code> query param.
        </p>
      </div>

      {/* Right sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 24 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Security tips</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {[
              "Never commit your key to version control",
              "Use environment variables in CI/CD",
              "Treat it like a password — don't share it",
              "Sign out and back in to rotate your key",
            ].map((tip, i) => (
              <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--purple-light)", flexShrink: 0, marginTop: 1 }}>•</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>VS Code setup</div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 10 }}>
            Copy your key above, then open VS Code Settings and paste it into <strong style={{ color: "var(--text)" }}>Wright: Api Key</strong>.
          </p>
          <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-code)", background: "rgba(175,169,236,0.06)", border: "1px solid rgba(175,169,236,0.1)", borderRadius: 5, padding: "3px 8px", display: "block", lineHeight: 1.6 }}>Cmd+, → search "wright"</code>
        </div>
      </div>
    </div>
  );
}
