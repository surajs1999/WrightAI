"use client";

import { useEffect, useState } from "react";

export interface ConnectedRepo {
  id: string;
  name: string;
  local_path: string;
}

/**
 * Fetches connected repositories from the API and manages the currently selected repository state.
 *
 * A React hook that loads the list of connected repositories on mount, automatically selects the first repository if available, and provides state management for repository selection. The hook handles loading states and silently catches any fetch errors.
 * @returns {{ repos: ConnectedRepo[], loadingRepos: boolean, selectedRepoId: string, setSelectedRepoId: (id: string) => void, selectedRepo: ConnectedRepo | null }} An object containing the list of repositories, loading state, currently selected repository ID, a function to update the selected repository ID, and the currently selected repository object (or null if none is selected).
 * @example
 * const { repos, loadingRepos, selectedRepoId, setSelectedRepoId, selectedRepo } = useConnectedRepos();
 */
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
