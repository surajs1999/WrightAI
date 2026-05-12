"use client";

import { useEffect, useState } from "react";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  masked: string;
  created: string;
  lastUsed: string;
  expiry: string;
}

/**
 * Renders a React component that displays and manages API keys for the Wright API, including fetching, copying, revealing, and revoking keys.
 *
 * This component provides a dashboard interface for API key management with features including: loading keys from the /api/auth/key endpoint, displaying keys in a table with masked/revealed toggle, copying keys to clipboard, revoking keys with confirmation, enforcing a free-tier limit of 1 key, and showing security tips and usage examples in a sidebar. The component handles multiple UI states including loading, empty state, and a modal for upgrade prompts.
 * @returns {JSX.Element} A React component containing the complete API keys management interface with table, sidebar, and modal elements.
 * @example
 * <KeysPage />
 */
export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [expiry, setExpiry] = useState("never");
  const [revealed, setRevealed] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/key")
      .then(r => r.json())
      .then(d => {
        if (d.key) {
          const created = d.created_at
            ? new Date(d.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            : "On signup";
          setKeys([{
            id: "default",
            name: "Default",
            key: d.key,
            masked: d.masked,
            created,
            lastUsed: "Just now",
            expiry: "Never",
          }]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyKey = (id: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const revokeKey = (id: string) => {
    setKeys(prev => prev.filter(k => k.id !== id));
    setRevokeConfirm(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setNewName("");
    setExpiry("never");
  };

  const FREE_LIMIT = 1;
  const atLimit = keys.length >= FREE_LIMIT;

  return (
    <>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 24, alignItems: "flex-start" }}>
      {/* Main content */}
      <div>

      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18, color: "var(--text)", marginBottom: 4 }}>API Keys</h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Use these keys to authenticate with the Wright API and MCP server.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={atLimit}
          title={atLimit ? "Free plan is limited to 1 key. Upgrade to create more." : undefined}
          style={{
            padding: "9px 20px", background: atLimit ? "rgba(83,74,183,0.3)" : "var(--purple)",
            color: "#fff", border: "none", borderRadius: 8,
            fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 14,
            cursor: atLimit ? "not-allowed" : "pointer",
            opacity: atLimit ? 0.6 : 1, flexShrink: 0,
          }}
        >
          + Create new key
        </button>
      </div>

      {/* Keys table — horizontal scroll on narrow viewports */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
        {/* Table header */}
        <div style={{
          display: "grid", gridTemplateColumns: "160px 1fr 110px 120px 180px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(0,0,0,0.2)",
          minWidth: 640,
        }}>
          {["Name", "Key", "Created", "Last used", "Actions"].map(h => (
            <div key={h} style={{
              padding: "10px 16px",
              fontFamily: "var(--font-mono)", fontSize: 10,
              color: "rgba(175,169,236,0.45)",
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              {h}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "40px 20px", textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
            Loading…
          </div>
        ) : keys.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, marginBottom: 12, opacity: 0.3 }}>🔑</div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)" }}>No API keys found. Try signing out and back in.</p>
          </div>
        ) : (
          keys.map((k, i) => (
            <div
              key={k.id}
              style={{
                display: "grid", gridTemplateColumns: "160px 1fr 110px 120px 180px",
                borderBottom: i < keys.length - 1 ? "1px solid var(--border)" : "none",
                alignItems: "center",
                minWidth: 640,
                transition: "background 0.12s",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(175,169,236,0.03)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              {/* Name — stacked with status badge below */}
              <div style={{ padding: "14px 16px" }}>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text)", fontWeight: 500, marginBottom: 4 }}>
                  {k.name}
                </div>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9,
                  padding: "2px 7px", borderRadius: 999,
                  background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.25)",
                  color: "var(--green)", letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                  Active
                </span>
              </div>

              {/* Key — masked value + eye icon toggle */}
              <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <code style={{
                  fontFamily: "var(--font-mono)", fontSize: 12,
                  color: "var(--text-code)",
                  background: "rgba(175,169,236,0.06)",
                  border: "1px solid rgba(175,169,236,0.1)",
                  borderRadius: 6, padding: "4px 10px",
                  letterSpacing: "0.03em",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  maxWidth: "100%",
                }}>
                  {revealed === k.id ? k.key : k.masked}
                </code>
                {/* Eye icon button */}
                <button
                  onClick={() => setRevealed(v => v === k.id ? null : k.id)}
                  title={revealed === k.id ? "Hide key" : "Reveal key"}
                  style={{
                    flexShrink: 0, width: 28, height: 28,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "transparent", border: "1px solid var(--border)",
                    borderRadius: 6, cursor: "pointer", color: "var(--text-muted)",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = "rgba(175,169,236,0.35)"; el.style.color = "var(--text)"; }}
                  onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = "var(--border)"; el.style.color = "var(--text-muted)"; }}
                >
                  {revealed === k.id
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>

              {/* Created */}
              <div style={{ padding: "14px 16px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                {k.created}
              </div>

              {/* Last used */}
              <div style={{ padding: "14px 16px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                {k.lastUsed}
              </div>

              {/* Actions — Copy + Revoke */}
              <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                {revokeConfirm === k.id ? (
                  <>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Revoke?</span>
                    <button onClick={() => revokeKey(k.id)} style={{ padding: "5px 10px", background: "rgba(226,75,74,0.15)", border: "1px solid rgba(226,75,74,0.4)", borderRadius: 5, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--red)", cursor: "pointer" }}>Yes</button>
                    <button onClick={() => setRevokeConfirm(null)} style={{ padding: "5px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 5, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}>No</button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => copyKey(k.id, k.key)}
                      style={{
                        padding: "5px 14px",
                        background: copiedId === k.id ? "rgba(29,158,117,0.15)" : "var(--purple)",
                        border: copiedId === k.id ? "1px solid rgba(29,158,117,0.4)" : "none",
                        borderRadius: 6,
                        fontFamily: "var(--font-mono)", fontSize: 11,
                        color: copiedId === k.id ? "var(--green)" : "#fff",
                        cursor: "pointer", transition: "all 0.2s",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {copiedId === k.id ? "✓ Copied" : "Copy key"}
                    </button>
                    <button
                      onClick={() => setRevokeConfirm(k.id)}
                      style={{
                        padding: "5px 12px", background: "transparent",
                        border: "1px solid rgba(226,75,74,0.25)", borderRadius: 6,
                        fontFamily: "var(--font-mono)", fontSize: 11,
                        color: "var(--red)", cursor: "pointer", transition: "all 0.15s",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={e => { const el = e.currentTarget; el.style.background = "rgba(226,75,74,0.08)"; el.style.borderColor = "rgba(226,75,74,0.5)"; }}
                      onMouseLeave={e => { const el = e.currentTarget; el.style.background = "transparent"; el.style.borderColor = "rgba(226,75,74,0.25)"; }}
                    >
                      Revoke
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
        </div>
      </div>

      {/* Usage note */}
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginTop: 14 }}>
        Pass your key via the <code style={{ color: "var(--text-code)", background: "rgba(175,169,236,0.07)", padding: "1px 6px", borderRadius: 4 }}>X-Wright-API-Key</code> header or as the <code style={{ color: "var(--text-code)", background: "rgba(175,169,236,0.07)", padding: "1px 6px", borderRadius: 4 }}>api_key</code> query param.
      </p>
      </div>

      {/* Right sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 24 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 20px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Security tips</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {[
              "Never commit keys to version control",
              "Use environment variables in CI/CD",
              "Rotate keys regularly",
              "Revoke unused keys",
            ].map((tip, i) => (
              <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--purple-light)", flexShrink: 0, marginTop: 1 }}>•</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 20px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Usage</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginBottom: 5 }}>Header</div>
            <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-code)", background: "rgba(175,169,236,0.06)", border: "1px solid rgba(175,169,236,0.1)", borderRadius: 5, padding: "3px 8px", display: "block", lineHeight: 1.6 }}>X-Wright-API-Key: wai_…</code>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginBottom: 5 }}>Query param</div>
            <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-code)", background: "rgba(175,169,236,0.06)", border: "1px solid rgba(175,169,236,0.1)", borderRadius: 5, padding: "3px 8px", display: "block", lineHeight: 1.6 }}>?api_key=wai_…</code>
          </div>
        </div>
      </div>
    </div>

    {/* Upgrade modal for free limit */}
    {showModal && (
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(8,6,18,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}
        onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
      >
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 28px", width: 400, boxShadow: "0 0 60px rgba(83,74,183,0.25)" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18, color: "var(--text)", marginBottom: 10 }}>
            Free plan limit
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.6 }}>
            The free plan includes 1 API key. Upgrade to create multiple keys for CI/CD, team members, or different environments.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={closeModal} style={{ padding: "8px 18px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: 14, cursor: "pointer" }}>
              Close
            </button>
            <button style={{ padding: "8px 22px", background: "var(--purple)", color: "#fff", border: "none", borderRadius: 8, fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 14, cursor: "pointer" }}>
              Upgrade
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
