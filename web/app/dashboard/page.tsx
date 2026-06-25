"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ga } from "@/lib/ga";
import MetricCard from "@/components/dashboard/MetricCard";
import CoverageBar from "@/components/dashboard/CoverageBar";
import { Spinner, SkeletonBlock, SpinnerArc } from "@/components/dashboard/Spinner";

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
  const router = useRouter();
  const [showUpgraded, setShowUpgraded] = useState(false);
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [repos, setRepos] = useState<{ id: string; name: string; local_path: string }[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
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
  const [driftCount, setDriftCount] = useState<number | null>(null);
  const [driftLoading, setDriftLoading] = useState(false);
  const [selectedGithubRepo, setSelectedGithubRepo] = useState("");

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
    // Fire sign_up on first post-auth dashboard load
    const method = sessionStorage.getItem("wright_sign_up_method") as "github" | "google" | null;
    if (method) {
      ga.signUp(method);
      sessionStorage.removeItem("wright_sign_up_method");
    }

    // First visit ever to dashboard
    const visitedKey = "wright_dashboard_visited";
    if (!localStorage.getItem(visitedKey)) {
      ga.dashboardFirstVisit();
      localStorage.setItem(visitedKey, "1");
    }

    fetch("/api/proxy/auth/github/status")
      .then(r => r.json())
      .then((d: { connected: boolean }) => {
        setGithubConnected(d.connected);
        if (d.connected) loadGithubRepos();
      })
      .catch(() => {});
  }, []);  

  useEffect(() => {
    if (searchParams.get("github") === "connected") {
       
      setGithubConnected(true);
      loadGithubRepos();
    }
  }, [searchParams]);  

  useEffect(() => {
    if (searchParams.get("upgraded") === "true") {
       
      setShowUpgraded(true);
      router.replace("/dashboard");
    }
  }, [searchParams, router]);

  useEffect(() => {
    setLoadingRepos(true);
    fetch("/api/proxy/repos")
      .then(r => r.json())
      .then((data: { id: string; name: string; local_path: string }[]) => {
        if (Array.isArray(data)) {
          setRepos(data);
          if (data.length > 0) setSelectedRepo(data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRepos(false));
  }, []);

  useEffect(() => {
    if (!selectedRepo) return;
    const path = repos.find(r => r.id === selectedRepo)?.local_path;
    if (!path) return;
    setLoading(true);
    fetch(`/api/proxy/coverage?repo_root=${encodeURIComponent(path)}`)
      .then(r => r.json())
      .then((d: CoverageData) => setCoverage(d))
      .catch(() => setCoverage(null))
      .finally(() => setLoading(false));
  }, [selectedRepo, repos]);

  useEffect(() => {
    if (!selectedRepo) return;
    const repo = repos.find(r => r.id === selectedRepo);
    if (!repo) return;
    let cancelled = false;
     
    setDriftCount(null);
     
    setDriftLoading(true);
    (async () => {
      try {
        // Prefer the Redis function index, populated by the VS Code extension's
        // local drift runs (which have a real baseline to detect drift against).
        const res = await fetch(`/api/proxy/drift-check/results/${encodeURIComponent(repo.name)}`);
        const data: { results: { status: string }[] } = await res.json();
        if (data.results?.length > 0) {
          if (!cancelled) setDriftCount(data.results.filter(r => r.status === "drifted").length);
          return;
        }
        // No synced data yet — fall back to a live structural scan
        const liveRes = await fetch("/api/proxy/drift-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repo_root: repo.local_path }),
        });
        const live: { drifted: number } = await liveRes.json();
        if (!cancelled) setDriftCount(live.drifted ?? 0);
      } catch {
        if (!cancelled) setDriftCount(null);
      } finally {
        if (!cancelled) setDriftLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedRepo, repos]);

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
        ga.repoConnected(repo.name ?? repo.id);
      } else {
        const err = await res.json().catch(() => ({}));
        const errMsg = err.detail ?? `Error ${res.status}: could not connect repo`;
        setConnectError(errMsg);
        ga.connectRepoError(err.detail ? (res.status === 429 ? "quota_exceeded" : res.status === 403 ? "plan_limit" : "api_error") : "network_error");
      }
    } catch {
      setConnectError("Network error — could not reach the API.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div>
      {/* Upgrade confirmation */}
      {showUpgraded && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.3)",
          borderRadius: 10, padding: "13px 18px", marginBottom: 20,
          fontFamily: "var(--font-body)", fontSize: 13.5, color: "#1D9E75",
        }}>
          <span>🎉 Welcome to Pro! Your account has been upgraded — enjoy 1,500 doc generations, 1,000 drift detections, 1,000 chats/month, auto-PR, GitHub Action comments, and more.</span>
          <button
            onClick={() => setShowUpgraded(false)}
            aria-label="Dismiss"
            style={{
              background: "transparent", border: "none", color: "#1D9E75",
              cursor: "pointer", fontSize: 16, lineHeight: 1, flexShrink: 0, padding: 4,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Repo section */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>

        {/* Row 1: active repo selector + remove */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
              Active repo
            </span>
            {loadingRepos ? (
              <SkeletonBlock width={160} height={30} />
            ) : repos.length > 0 ? (
              <select
                value={selectedRepo}
                onChange={e => { setSelectedRepo(e.target.value); setConfirmDisconnect(false); }}
                style={{
                  background: "rgba(175,169,236,0.06)", border: "1px solid rgba(175,169,236,0.2)",
                  borderRadius: 8, color: "var(--text)",
                  fontFamily: "var(--font-mono)", fontSize: 13,
                  padding: "6px 12px", outline: "none", cursor: "pointer",
                }}
              >
                {repos.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            ) : (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
                No repos connected yet
              </span>
            )}
          </div>

          {repos.length > 0 && (
            <button
              onClick={disconnectRepo}
              disabled={disconnecting}
              title={confirmDisconnect ? "Click again to confirm" : "Remove this repo"}
              style={{
                padding: "5px 12px",
                background: confirmDisconnect ? "rgba(226,75,74,0.12)" : "transparent",
                border: `1px solid ${confirmDisconnect ? "rgba(226,75,74,0.5)" : "rgba(226,75,74,0.25)"}`,
                borderRadius: 7, fontFamily: "var(--font-mono)", fontSize: 11,
                color: "var(--red)", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(226,75,74,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = confirmDisconnect ? "rgba(226,75,74,0.12)" : "transparent"; }}
            >
              {disconnecting ? "Removing…" : confirmDisconnect ? "Confirm?" : "✕ Remove"}
            </button>
          )}
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--border)", marginBottom: 16 }} />

        {/* Row 2: connect new repo */}
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
          Connect a repository
        </div>

        {githubConnected ? (
          /* GitHub connected — show repo picker */
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--green)", whiteSpace: "nowrap" }}>✓ GitHub</span>
            <select
              value={selectedGithubRepo}
              onChange={e => setSelectedGithubRepo(e.target.value)}
              style={{
                flex: 1, background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--text)",
                fontFamily: "var(--font-mono)", fontSize: 13,
                padding: "7px 12px", outline: "none", cursor: "pointer",
              }}
            >
              {githubRepos.map(r => (
                <option key={r.clone_url} value={r.clone_url}>{r.private ? "🔒 " : ""}{r.full_name}</option>
              ))}
            </select>
            <button
              onClick={async () => {
                if (!selectedGithubRepo || connecting) return;
                setConnecting(true); setConnectError(null);
                try {
                  const res = await fetch("/api/proxy/repos/connect", {
                    method: "POST", headers: { "Content-Type": "application/json" },
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
                padding: "7px 18px", background: "var(--purple)", color: "#fff",
                border: "none", borderRadius: 8, fontFamily: "var(--font-body)", fontSize: 13,
                cursor: connecting ? "not-allowed" : "pointer", opacity: connecting ? 0.55 : 1, whiteSpace: "nowrap",
              }}
            >
              {connecting ? "Connecting…" : "Connect"}
            </button>
          </div>
        ) : (
          /* GitHub not connected — URL input + Connect + GitHub on one row */
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={connectUrl}
              onChange={e => setConnectUrl(e.target.value)}
              placeholder="https://github.com/user/repo"
              onKeyDown={e => e.key === "Enter" && connectRepo()}
              style={{
                flex: 1, background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 13,
                padding: "7px 12px", outline: "none", transition: "border-color 0.15s",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "rgba(175,169,236,0.5)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
            />
            <button
              onClick={connectRepo}
              disabled={connecting || !connectUrl.trim()}
              style={{
                padding: "7px 18px", background: "var(--purple)", color: "#fff",
                border: "none", borderRadius: 8, fontFamily: "var(--font-body)", fontSize: 13,
                cursor: connecting || !connectUrl.trim() ? "not-allowed" : "pointer",
                opacity: connecting || !connectUrl.trim() ? 0.55 : 1, whiteSpace: "nowrap",
              }}
            >
              {connecting ? "Connecting…" : "Connect"}
            </button>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>or</span>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/api/auth/github"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", background: "#24292e", color: "#fff",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                fontFamily: "var(--font-body)", fontSize: 12, textDecoration: "none", whiteSpace: "nowrap",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              Connect GitHub
            </a>
          </div>
        )}
      </div>

      {connectError && (
        <div style={{ padding: "10px 14px", background: "rgba(226,75,74,0.08)", border: "1px solid rgba(226,75,74,0.25)", borderRadius: 8, color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: 12, marginBottom: 20 }}>
          ✕ {connectError}
        </div>
      )}

      {/* Metric cards */}
      {(() => {
        const hasData = coverage && coverage.total > 0;
        if (loading && !coverage) {
          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
                  <SkeletonBlock width={80} height={10} style={{ marginBottom: 12 }} />
                  <SkeletonBlock width={64} height={32} />
                </div>
              ))}
            </div>
          );
        }
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 28 }}>
            <MetricCard label="Total Functions" value={hasData ? String(coverage!.total) : "—"} color="var(--purple-light)" />
            <MetricCard label="Documented" value={hasData ? String(coverage!.documented) : "—"} color="var(--green)" />
            <MetricCard label="Coverage" value={hasData ? `${coverage!.overall_pct.toFixed(0)}%` : "—"} color={hasData ? (coverage!.overall_pct >= 80 ? "var(--green)" : coverage!.overall_pct >= 50 ? "var(--amber)" : "var(--red)") : undefined} />
            <MetricCard label="Undocumented" value={hasData ? String(coverage!.total - coverage!.documented) : "—"} color={hasData ? (coverage!.total - coverage!.documented === 0 ? "var(--green)" : "var(--red)") : undefined} href="/dashboard/generate" cta="Generate" />
            <MetricCard label="Drifted" value={driftLoading ? "…" : driftCount !== null ? String(driftCount) : "—"} color={driftCount === 0 ? "var(--green)" : driftCount !== null && driftCount > 0 ? "var(--amber)" : undefined} href="/dashboard/drift" cta="Fix" />
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

      {/* Pro upgrade teaser */}
      <div style={{
        background: "linear-gradient(135deg, rgba(83,74,183,0.07) 0%, rgba(83,74,183,0.03) 100%)",
        border: "1px solid rgba(83,74,183,0.18)", borderRadius: 10,
        padding: "14px 20px", marginBottom: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
      }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(175,169,236,0.65)" }}>
          Pro gives you 3× more generations, drift detections & chat, auto-PR, GitHub Action comments, and enhanced dashboard analytics.
        </span>
        <Link href="/dashboard/pricing" style={{
          fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12.5,
          color: "#AFA9EC", textDecoration: "none", whiteSpace: "nowrap",
          padding: "6px 14px", borderRadius: 7,
          background: "rgba(83,74,183,0.15)", border: "1px solid rgba(127,119,221,0.25)",
        }}>
          See plans →
        </Link>
      </div>

      {/* Activity feed */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>Repo summary</div>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
            <Spinner size={7} gap={8} />
            Scanning repository…
          </div>
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
