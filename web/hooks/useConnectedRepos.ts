"use client";

import { useEffect, useState } from "react";

export interface ConnectedRepo {
  id: string;
  name: string;
  local_path: string;
}

export function useConnectedRepos() {
  const [repos, setRepos] = useState<ConnectedRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [selectedRepoId, setSelectedRepoId] = useState("");

  useEffect(() => {
    fetch("/api/proxy/repos")
      .then(r => r.json())
      .then((data: ConnectedRepo[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setRepos(data);
          setSelectedRepoId(data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRepos(false));
  }, []);

  const selectedRepo = repos.find(r => r.id === selectedRepoId) ?? null;

  return { repos, loadingRepos, selectedRepoId, setSelectedRepoId, selectedRepo };
}
