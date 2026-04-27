"use client";

import { useState } from "react";

interface ApiKey {
  id: string;
  name: string;
  masked: string;
  created: string;
  lastUsed: string;
  expiry: string;
}

const MOCK_KEYS: ApiKey[] = [
  { id: "1", name: "Default", masked: "wai_••••••••••••8f2a", created: "Apr 18, 2026", lastUsed: "2 hours ago", expiry: "Never" },
];

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(MOCK_KEYS);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [expiry, setExpiry] = useState("never");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);

  const createKey = () => {
    const key = `wai_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    setNewKey(key);
    const expiryLabel = expiry === "30d" ? "Apr 21, 2027" : expiry === "90d" ? "Jul 20, 2026" : expiry === "1y" ? "Apr 21, 2027" : "Never";
    setKeys(prev => [...prev, {
      id: String(Date.now()),
      name: newName.trim() || "Unnamed key",
      masked: `wai_••••••••••••${key.slice(-4)}`,
      created: "Just now",
      lastUsed: "Never",
      expiry: expiryLabel,
    }]);
  };

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
    setNewKey(null);
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

      {/* Keys table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>

        {/* Table header */}
        <div style={{
          display: "grid", gridTemplateColumns: "180px 1fr 130px 140px 130px auto",
          borderBottom: "1px solid var(--border)",
          background: "rgba(0,0,0,0.2)",
          padding: "0 4px",
        }}>
          {["Name", "Key", "Created", "Last used", "Expires", ""].map(h => (
            <div key={h} style={{
              padding: "10px 14px",
              fontFamily: "var(--font-mono)", fontSize: 10,
              color: "rgba(175,169,236,0.45)",
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              {h}
            </div>
          ))}
        </div>

        {keys.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, marginBottom: 12, opacity: 0.3 }}>🔑</div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)" }}>No API keys yet. Create one to get started.</p>
          </div>
        ) : (
          keys.map((k, i) => (
            <div
              key={k.id}
              style={{
                display: "grid", gridTemplateColumns: "180px 1fr 130px 140px 130px auto",
                borderBottom: i < keys.length - 1 ? "1px solid var(--border)" : "none",
                alignItems: "center",
                padding: "0 4px",
                transition: "background 0.12s",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(175,169,236,0.03)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              {/* Name + status badge */}
              <div style={{ padding: "14px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text)", fontWeight: 500 }}>{k.name}</span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 9,
                  padding: "2px 7px", borderRadius: 999,
                  background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.25)",
                  color: "var(--green)", letterSpacing: "0.06em", textTransform: "uppercase",
                }}>
                  Active
                </span>
              </div>

              {/* Masked key + copy */}
              <div style={{ padding: "14px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <code style={{
                  fontFamily: "var(--font-mono)", fontSize: 12.5,
                  color: "var(--text-code)",
                  background: "rgba(175,169,236,0.06)",
                  border: "1px solid rgba(175,169,236,0.1)",
                  borderRadius: 6, padding: "3px 10px",
                  letterSpacing: "0.04em",
                }}>
                  {k.masked}
                </code>
                <button
                  onClick={() => copyKey(k.id, k.masked)}
                  style={{
                    flexShrink: 0,
                    padding: "4px 10px", background: "transparent",
                    border: "1px solid var(--border)", borderRadius: 5,
                    fontFamily: "var(--font-mono)", fontSize: 11,
                    color: copiedId === k.id ? "var(--green)" : "var(--text-muted)",
                    cursor: "pointer", transition: "all 0.15s",
                    borderColor: copiedId === k.id ? "rgba(29,158,117,0.4)" : "var(--border)",
                  }}
                >
                  {copiedId === k.id ? "✓" : "Copy"}
                </button>
              </div>

              {/* Created */}
              <div style={{ padding: "14px 14px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                {k.created}
              </div>

              {/* Last used */}
              <div style={{ padding: "14px 14px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                {k.lastUsed}
              </div>

              {/* Expiry */}
              <div style={{ padding: "14px 14px", fontFamily: "var(--font-mono)", fontSize: 12, color: k.expiry === "Never" ? "var(--text-muted)" : "var(--amber)" }}>
                {k.expiry}
              </div>

              {/* Actions */}
              <div style={{ padding: "14px 14px" }}>
                {revokeConfirm === k.id ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Sure?</span>
                    <button
                      onClick={() => revokeKey(k.id)}
                      style={{ padding: "4px 10px", background: "rgba(226,75,74,0.15)", border: "1px solid rgba(226,75,74,0.4)", borderRadius: 5, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--red)", cursor: "pointer" }}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setRevokeConfirm(null)}
                      style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 5, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setRevokeConfirm(k.id)}
                    style={{
                      padding: "5px 12px", background: "transparent",
                      border: "1px solid rgba(226,75,74,0.25)", borderRadius: 6,
                      fontFamily: "var(--font-mono)", fontSize: 11,
                      color: "var(--red)", cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.background = "rgba(226,75,74,0.08)"; el.style.borderColor = "rgba(226,75,74,0.5)"; }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.background = "transparent"; el.style.borderColor = "rgba(226,75,74,0.25)"; }}
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))
        )}
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

      {/* Create modal */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(8,6,18,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px 28px", width: 420, boxShadow: "0 0 60px rgba(83,74,183,0.25)" }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 18, color: "var(--text)", marginBottom: 6 }}>
              {newKey ? "Key created" : "Create new key"}
            </h2>
            {!newKey && (
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", marginBottom: 22 }}>
                Name your key so you can identify it later.
              </p>
            )}

            {!newKey ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 7 }}>Key name</label>
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && newName.trim()) createKey(); }}
                    placeholder="e.g. Production, CI/CD, Local dev"
                    style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font-body)", fontSize: 14, padding: "9px 13px", outline: "none", boxSizing: "border-box" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "rgba(175,169,236,0.5)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 7 }}>Expiry</label>
                  <select
                    value={expiry}
                    onChange={e => setExpiry(e.target.value)}
                    style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font-body)", fontSize: 14, padding: "9px 13px", outline: "none" }}
                  >
                    <option value="30d">30 days</option>
                    <option value="90d">90 days</option>
                    <option value="1y">1 year</option>
                    <option value="never">Never</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={closeModal} style={{ padding: "8px 18px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
                  <button onClick={createKey} style={{ padding: "8px 22px", background: "var(--purple)", color: "#fff", border: "none", borderRadius: 8, fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 14, cursor: "pointer" }}>Create key</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ padding: "10px 14px", background: "rgba(239,159,39,0.08)", border: "1px solid rgba(239,159,39,0.28)", borderRadius: 8, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--amber)", marginBottom: 16, lineHeight: 1.5 }}>
                  ⚠ Copy this key now — it won&apos;t be shown again.
                </div>
                <div style={{ background: "#0A0818", border: "1px solid var(--border)", borderRadius: 8, padding: "13px 16px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-code)", marginBottom: 20, wordBreak: "break-all", letterSpacing: "0.03em", lineHeight: 1.6 }}>
                  {newKey}
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => copyKey("new", newKey)}
                    style={{
                      padding: "9px 22px", background: copiedId === "new" ? "rgba(29,158,117,0.2)" : "var(--purple)",
                      color: copiedId === "new" ? "var(--green)" : "#fff",
                      border: copiedId === "new" ? "1px solid rgba(29,158,117,0.4)" : "none",
                      borderRadius: 8, fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 14, cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {copiedId === "new" ? "✓ Copied!" : "Copy key"}
                  </button>
                  <button onClick={closeModal} style={{ padding: "9px 18px", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontFamily: "var(--font-body)", fontSize: 14, cursor: "pointer" }}>Done</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

