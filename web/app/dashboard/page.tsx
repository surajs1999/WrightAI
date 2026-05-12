"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MetricCard from "@/components/dashboard/MetricCard";
import CoverageBar from "@/components/dashboard/CoverageBar";

interface CoverageData {
  overall_pct: number;
  total: number;
  documented: number;
  by_folder: Record<string, number>;
}

/**
 * Renders the main dashboard home page component with repository management, GitHub integration, and code coverage visualization.
 *
 * A React functional component that provides a comprehensive dashboard interface for managing connected repositories, viewing documentation coverage metrics, and integrating with GitHub. It handles repository connection/disconnection, displays coverage statistics by folder, and provides authentication flows for GitHub integration. The component fetches and displays real-time coverage data, manages repository selection, and handles various UI states including loading, errors, and empty states.
 * @returns {JSX.Element} A JSX element containing the complete dashboard UI with repository connection controls, metric cards, coverage visualizations, and activity feed.
 * @example
 * <DashboardHome />
 */
export default function DashboardHome() {
  const searchParams = useSearchParams();
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [repos, setRepos] = useState<{ id: string; name: string }[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showAllFolders, setShowAllFolders] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [connectUrl, setConnectUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubRepos, setGithubRepos] = useState<{ full_name: string; private: boolean; clone_url: string }[]>([]);
  const [selectedGithubRepo, setSelectedGithubRepo] = useState("");

  useEffect(() => {
    fetch("/api/proxy/auth/github/status")
      .then(r => r.json())
      .then((d: { connected: boolean }) => {
        setGithubConnected(d.connected);
        if (d.connected) loadGithubRepos();
      })
      .catch(() => {});
  }, []);

  const loadGithubRepos = () => {
    fetch("/api/proxy/auth/github/repos")
      .then(r => r.json())
      .then((d: { repos: { full_name: string; private: boolean; clone_url: string }[] }) => {
        if (d.repos?.length) {
          setGithubRepos(d.repos);
          setSelectedGithubRepo(d.repos[0].clone_url);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (searchParams.get("github") === "connected") {
      setGithubConnected(true);
      loadGithubRepos();
    }
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/proxy/repos")
      .then(r => r.json())
      .then((data: { id: string; name: string; local_path: string }[]) => {
        if (Array.isArray(data)) {
          setRepos(data);
          if (data.length > 0) setSelectedRepo(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedRepo) return;
    const path = `/data/repos/${selectedRepo}`;
    setLoading(true);
    fetch(`/api/proxy/coverage?repo_root=${encodeURIComponent(path)}`)
      .then(r => r.json())
      .then((d: CoverageData) => setCoverage(d))
      .catch(() => setCoverage(null))
      .finally(() => setLoading(false));
  }, [selectedRepo]);

  const disconnectRepo = async () => {
    if (!selectedRepo) return;
    if (!confirmDisconnect) { setConfirmDisconnect(true); return; }
    setDisconnecting(true);
    setConfirmDisconnect(false);
    try {
      const repoName = selectedRepo.split("/").slice(1).join("/");
      await fetch(`/api/proxy/repos/${encodeURIComponent(repoName)}`, { method: "DELETE" });
      const remaining = repos.filter(r => r.id !== selectedRepo);
      setRepos(remaining);
      setSelectedRepo(remaining[0]?.id ?? "");
      setCoverage(null);
      if (localStorage.getItem("wright_last_repo_path")?.includes(repoName)) {
        localStorage.removeItem("wright_last_repo_path");
      }
    } finally {
      setDisconnecting(false);
    }
  };

  const connectRepo = async () => {
    if (!connectUrl.trim()) return;
    setConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/proxy/repos/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ git_url: connectUrl.trim(), branch: "main", github_token: githubToken.trim() || undefined }),
      });
      if (res.ok) {
        const repo = await res.json();
        setRepos(prev => prev.some(r => r.id === repo.id) ? prev : [...prev, repo]);
        setSelectedRepo(repo.id);
        setConnectUrl("");
        localStorage.setItem("wright_last_repo_path", repo.local_path);
      } else {
        const err = await res.json().catch(() => ({}));
        setConnectError(err.detail ?? `Error ${res.status}: could not connect repo`);
      }
    } catch {
      setConnectError("Network error — could not reach the API.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div>
      {/* Repo connect card */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 22px", marginBottom: 24 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Connected repositories</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {repos.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <select
              value={selectedRepo}
              onChange={e => { setSelectedRepo(e.target.value); setConfirmDisconnect(false); }}
              style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--text)",
                fontFamily: "var(--font-mono)", fontSize: 13,
                padding: "8px 12px", outline: "none", cursor: "pointer",
              }}
            >
              {repos.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <button
              onClick={disconnectRepo}
              disabled={disconnecting}
              title={confirmDisconnect ? "Click again to confirm" : "Disconnect repo"}
              style={{
                padding: "8px 12px",
                background: confirmDisconnect ? "rgba(226,75,74,0.12)" : "transparent",
                border: `1px solid ${confirmDisconnect ? "rgba(226,75,74,0.5)" : "rgba(226,75,74,0.3)"}`,
                borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12,
                color: "var(--red)", cursor: "pointer", transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(226,75,74,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = confirmDisconnect ? "rgba(226,75,74,0.12)" : "transparent"; }}
            >
              {disconnecting ? "Removing…" : confirmDisconnect ? "Confirm remove?" : "✕ Remove"}
            </button>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 260 }}>
          {githubConnected && githubRepos.length > 0 ? (
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={selectedGithubRepo}
                onChange={e => setSelectedGithubRepo(e.target.value)}
                style={{
                  flex: 1, background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 8, color: "var(--text)",
                  fontFamily: "var(--font-mono)", fontSize: 13,
                  padding: "8px 12px", outline: "none", cursor: "pointer",
                }}
              >
                {githubRepos.map(r => (
                  <option key={r.clone_url} value={r.clone_url}>
                    {r.private ? "🔒 " : ""}{r.full_name}
                  </option>
                ))}
              </select>
              <button
                onClick={async () => {
                  if (!selectedGithubRepo || connecting) return;
                  setConnecting(true);
                  setConnectError(null);
                  try {
                    const res = await fetch("/api/proxy/repos/connect", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ git_url: selectedGithubRepo, branch: "main" }),
                    });
                    if (res.ok) {
                      const repo = await res.json();
                      setRepos(prev => prev.some(r => r.id === repo.id) ? prev : [...prev, repo]);
                      setSelectedRepo(repo.id);
                      localStorage.setItem("wright_last_repo_path", repo.local_path);
                    } else {
                      const err = await res.json().catch(() => ({}));
                      setConnectError(err.detail ?? `Error ${res.status}`);
                    }
                  } catch { setConnectError("Network error."); }
                  finally { setConnecting(false); }
                }}
                disabled={connecting || !selectedGithubRepo}
                style={{
                  padding: "8px 18px", background: "var(--purple)", color: "#fff",
                  border: "none", borderRadius: 8, fontFamily: "var(--font-body)", fontSize: 13,
                  cursor: connecting ? "not-allowed" : "pointer",
                  opacity: connecting ? 0.55 : 1,
                }}
              >
                {connecting ? "Connecting…" : "Connect repo"}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={connectUrl}
                onChange={e => setConnectUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                onKeyDown={e => e.key === "Enter" && connectRepo()}
                style={{
                  flex: 1, background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 8, color: "var(--text)",
                  fontFamily: "var(--font-mono)", fontSize: 13,
                  padding: "8px 12px", outline: "none", transition: "border-color 0.15s",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(175,169,236,0.5)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
              />
              <button
                onClick={connectRepo}
                disabled={connecting || !connectUrl.trim()}
                style={{
                  padding: "8px 18px", background: "var(--purple)", color: "#fff",
                  border: "none", borderRadius: 8, fontFamily: "var(--font-body)", fontSize: 13,
                  cursor: connecting || !connectUrl.trim() ? "not-allowed" : "pointer",
                  opacity: connecting || !connectUrl.trim() ? 0.55 : 1,
                }}
              >
                {connecting ? "Connecting…" : "Connect repo"}
              </button>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {githubConnected ? (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--green, #4ade80)" }}>
                ✓ GitHub connected
              </span>
            ) : (
              <>
                <a
                  href="/api/auth/github"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", background: "#24292e", color: "#fff",
                    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                    fontFamily: "var(--font-body)", fontSize: 13, textDecoration: "none",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                  </svg>
                  Connect GitHub
                </a>
                <input
                  value={githubToken}
                  onChange={e => setGithubToken(e.target.value)}
                  placeholder="or paste token manually"
                  type="password"
                  style={{
                    flex: 1, background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 8, color: "var(--text)",
                    fontFamily: "var(--font-mono)", fontSize: 12,
                    padding: "6px 12px", outline: "none",
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
      </div>

      {connectError && (
        <div style={{ padding: "10px 14px", background: "rgba(226,75,74,0.08)", border: "1px solid rgba(226,75,74,0.25)", borderRadius: 8, color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: 12, marginBottom: 20 }}>
          ✕ {connectError}
        </div>
      )}

      {/* Metric cards */}
      {(() => {
        const hasData = coverage && coverage.total > 0;
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
            <MetricCard label="Total Functions" value={hasData ? String(coverage!.total) : "—"} color="var(--purple-light)" />
            <MetricCard label="Documented" value={hasData ? String(coverage!.documented) : "—"} color="var(--green)" />
            <MetricCard label="Coverage" value={hasData ? `${coverage!.overall_pct.toFixed(0)}%` : "—"} color={hasData ? (coverage!.overall_pct >= 80 ? "var(--green)" : coverage!.overall_pct >= 50 ? "var(--amber)" : "var(--red)") : undefined} />
            <MetricCard label="Drifted" value={hasData ? String(coverage!.total - coverage!.documented) : "—"} color={hasData ? (coverage!.total - coverage!.documented === 0 ? "var(--green)" : "var(--red)") : undefined} />
          </div>
        );
      })()}

      {/* Coverage by folder */}
      {coverage && Object.keys(coverage.by_folder).length > 0 && (() => {
        const tier = (p: number) => p >= 80 ? 0 : p >= 50 ? 1 : 2;
        const sorted = Object.entries(coverage.by_folder).sort(([, a], [, b]) => tier(a) - tier(b) || b - a);
        const critical = sorted.filter(([, p]) => p < 50).length;
        const needsWork = sorted.filter(([, p]) => p >= 50 && p < 80).length;
        const good = sorted.filter(([, p]) => p >= 80).length;
        const visible = showAllFolders ? sorted : sorted.slice(0, 8);
        return (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px", marginBottom: 28 }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                Coverage by folder
              </span>
              <div style={{ display: "flex", gap: 10 }}>
                {critical > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--red)", background: "rgba(226,75,74,0.08)", padding: "2px 8px", borderRadius: 4 }}>{critical} critical</span>}
                {needsWork > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--amber)", background: "rgba(239,159,39,0.08)", padding: "2px 8px", borderRadius: 4 }}>{needsWork} needs work</span>}
                {good > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--green)", background: "rgba(29,158,117,0.08)", padding: "2px 8px", borderRadius: 4 }}>{good} good</span>}
              </div>
            </div>

            {/* Column labels */}
            <div style={{ display: "grid", gridTemplateColumns: "16px 1fr auto 1fr auto", gap: 10, padding: "4px 10px", marginBottom: 4 }}>
              <span />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>Folder</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6, textAlign: "right", minWidth: 52 }}>Fns</span>
              <span />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6, textAlign: "right", minWidth: 42 }}>Cov</span>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", marginBottom: 4 }} />

            {visible.map(([folder, pct]) => (
              <CoverageBar key={folder} folder={folder} pct={pct} />
            ))}

            {sorted.length > 8 && (
              <button
                onClick={() => setShowAllFolders(s => !s)}
                style={{
                  marginTop: 10, width: "100%", padding: "7px",
                  background: "transparent", border: "1px solid var(--border)",
                  borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 11,
                  color: "var(--text-muted)", cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(175,169,236,0.4)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
              >
                {showAllFolders ? `Show less` : `Show ${sorted.length - 8} more folders`}
              </button>
            )}
          </div>
        );
      })()}

      {/* Activity feed */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>Repo summary</div>

        {loading && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>Scanning…</div>
        )}

        {!loading && !coverage && !selectedRepo && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
            Connect a repo above to see its summary.
          </div>
        )}

        {!loading && !coverage && selectedRepo && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
            Could not scan this repo. Check the API connection.
          </div>
        )}

        {!loading && coverage && coverage.total === 0 && (
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--amber)", marginBottom: 6 }}>
              ⚠ No supported source files found in this repo.
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Wright scans: Python, JavaScript, TypeScript, Java, Go, Rust.<br />
              This repo may use a different language (e.g. Dart, C#, Ruby).
            </div>
          </div>
        )}

        {!loading && coverage && coverage.total > 0 && (() => {
          const repoName = selectedRepo.split("/").pop() ?? selectedRepo;
          const undocumented = coverage.total - coverage.documented;
          const pct = coverage.overall_pct;
          const entries = [
            { icon: "✓", text: `${coverage.documented} functions documented · ${repoName}`, color: "var(--green)" },
            undocumented > 0
              ? { icon: "⚠", text: `${undocumented} function${undocumented !== 1 ? "s" : ""} undocumented`, color: "var(--amber)" }
              : { icon: "✓", text: "All functions documented", color: "var(--green)" },
            { icon: "→", text: `Coverage: ${pct.toFixed(0)}%`, color: pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)" },
            { icon: "→", text: `${Object.keys(coverage.by_folder).length} folder${Object.keys(coverage.by_folder).length !== 1 ? "s" : ""} scanned`, color: "var(--text-muted)" },
          ];
          return entries.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: a.color, width: 16, flexShrink: 0 }}>{a.icon}</span>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)" }}>{a.text}</div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
