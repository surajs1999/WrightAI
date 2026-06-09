from __future__ import annotations

import os
import subprocess
import time
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from api.auth import verify_api_key
from api.quota import check_feature_flag

router = APIRouter(prefix="/fix-pr", tags=["fix-pr"], dependencies=[Depends(verify_api_key)])


class FunctionRef(BaseModel):
    file_path: str
    function_name: str | None = None


class FixAndPRRequest(BaseModel):
    repo_root: str
    functions: list[FunctionRef]
    style: str = "google"
    github_token: str = ""
    branch_name: str = ""
    pr_title: str = ""


def _extract_token_from_url(remote_url: str) -> str | None:
    """
    Extracts an embedded authentication token from a GitHub HTTPS remote URL of the form `https://TOKEN@github.com/...`.

    Parses the provided remote URL by stripping whitespace, verifying it uses the HTTPS scheme and contains the `@github.com` hostname marker, then isolates the credential segment appearing between `https://` and the `@` character. Returns the token string if one is found and is neither an empty string nor the literal value `github.com`; otherwise returns `None`. This helper is called by `fix_and_pr()` to retrieve any personal access token embedded in a repository's remote URL.

    Args:
        remote_url (str): The full GitHub remote URL, potentially containing an embedded personal access token in the format `https://TOKEN@github.com/owner/repo.git`.

    Returns:
        str | None: The extracted token string if a valid token is embedded in the URL, or `None` if the URL does not match the expected HTTPS-with-credential format or contains no usable token.

    Example:
        ```
        token = _extract_token_from_url('https://ghp_abc123XYZ@github.com/owner/repo.git')
        # token == 'ghp_abc123XYZ'

        token = _extract_token_from_url('https://github.com/owner/repo.git')
        # token is None
        ```
    """
    url = remote_url.strip()
    if url.startswith("https://") and "@github.com" in url:
        after_scheme = url[len("https://") :]
        token = after_scheme.split("@")[0]
        if token and token != "github.com":
            return token
    return None


def _parse_github_owner_repo(remote_url: str) -> tuple[str, str]:
    """
    Extracts the GitHub owner and repository name from a given remote URL, supporting SSH, HTTPS, and token-embedded URL formats.

    Parses a GitHub remote URL in any of the common formats—SSH (`git@github.com:owner/repo.git`), plain HTTPS (`https://github.com/owner/repo.git`), or token-embedded HTTPS (`https://token@github.com/owner/repo.git`)—and returns the owner and repository name as a tuple of strings. Trailing `.git` suffixes and embedded authentication tokens are stripped automatically before parsing.

    Args:
        remote_url (str): The GitHub remote URL to parse. Accepted formats include SSH (`git@github.com:owner/repo.git`), HTTPS (`https://github.com/owner/repo`), and token-embedded HTTPS (`https://<token>@github.com/owner/repo.git`).

    Returns:
        tuple[str, str]: A two-element tuple containing the repository owner (username or organization name) as the first element and the repository name as the second element.

    Raises:
        ValueError: Raised when the provided `remote_url` does not contain a recognizable GitHub URL pattern (i.e., neither `git@github.com:` nor `github.com/` is found in the URL).

    Example:
        ```
        owner, repo = _parse_github_owner_repo('git@github.com:octocat/Hello-World.git')
        # owner == 'octocat', repo == 'Hello-World'

        owner, repo = _parse_github_owner_repo('https://github.com/octocat/Hello-World.git')
        # owner == 'octocat', repo == 'Hello-World'

        owner, repo = _parse_github_owner_repo('https://ghp_token123@github.com/octocat/Hello-World.git')
        # owner == 'octocat', repo == 'Hello-World'
        ```
    """
    url = remote_url.strip()
    # Strip any embedded token: https://token@github.com/owner/repo
    if "@github.com" in url and url.startswith("https://"):
        url = "https://github.com/" + url.split("github.com/", 1)[-1]
    if url.startswith("git@github.com:"):
        path = url.removeprefix("git@github.com:").removesuffix(".git")
    elif "github.com/" in url:
        path = url.split("github.com/", 1)[-1].removesuffix(".git")
    else:
        raise ValueError(f"Cannot parse GitHub owner/repo from: {remote_url}")
    owner, repo = path.split("/", 1)
    return owner, repo


def _get_default_branch(repo_path: Path, git_env: dict) -> str:
    """
    Retrieves the default branch name of a Git repository by querying the remote origin HEAD symbolic reference.

    Runs a Git subprocess command to resolve the symbolic reference at refs/remotes/origin/HEAD and extracts the branch name from the output. If the command fails, returns a non-zero exit code, or times out, the function falls back to returning 'main' as the default branch name. This function is called internally by fix_and_pr() to determine the base branch before creating a pull request.

    Args:
        repo_path (Path): The filesystem path to the local Git repository to inspect.
        git_env (dict): A dictionary of environment variables passed to the Git subprocess, typically containing credentials or Git configuration such as GIT_AUTHOR_NAME.

    Returns:
        str: The name of the repository's default branch (e.g., 'main' or 'master') parsed from the symbolic reference output, or 'main' if the reference cannot be determined.

    Raises:
        subprocess.TimeoutExpired: When the Git subprocess command execution exceeds the 10-second timeout limit.

    Example:
        ```
        branch = _get_default_branch(Path('/home/user/projects/my-repo'), {'GIT_AUTHOR_NAME': 'Bot', 'GIT_AUTHOR_EMAIL': 'bot@example.com'})
        ```
    """
    result = subprocess.run(
        ["git", "-C", str(repo_path), "symbolic-ref", "refs/remotes/origin/HEAD"],
        capture_output=True,
        text=True,
        timeout=10,
        env=git_env,
    )
    if result.returncode == 0:
        return result.stdout.strip().split("/")[-1]
    return "main"


@router.post("")
async def fix_and_pr(body: FixAndPRRequest, request: Request) -> dict:
    """
    Generates docstrings for specified functions, commits them to a new Git branch, and creates a GitHub pull request.

    Orchestrates the complete AI-powered documentation workflow: validates the repository path, extracts and resolves GitHub credentials, creates a new branch, generates docstrings via LLM and retrieval-augmented generation for each specified function, injects the docstrings into the codebase, commits and pushes the changes, then opens a pull request using the GitHub API. If no functions are successfully documented, the newly created branch is cleaned up and an error is returned.

    Args:
        body (FixAndPRRequest): Request body containing repo_root (path to the local repository), a list of FunctionRef objects identifying functions to document by file path and name, optional branch_name and pr_title overrides, an optional github_token for authentication, and a documentation style preference (e.g., 'google', 'numpy').
        request (Request): FastAPI Request object representing the incoming HTTP request; provided automatically by the framework.

    Returns:
        dict: A dictionary with keys: 'pr_url' (str, the HTML URL of the created GitHub pull request), 'pr_number' (int, the pull request number), 'branch' (str, the name of the newly created branch), 'fixed' (list[str], names of successfully documented functions), and 'errors' (list[str], error messages for any functions that could not be documented).

    Raises:
        HTTPException: status_code=404 when the repository path specified in body.repo_root does not exist on the server.
        HTTPException: status_code=400 when the GitHub owner and repository name cannot be parsed from the remote URL.
        HTTPException: status_code=400 when no GitHub token is found in the request body, stored token file, or remote URL.
        HTTPException: status_code=500 when Git branch creation via 'git checkout -b' fails.
        HTTPException: status_code=400 when none of the specified functions were successfully documented.
        HTTPException: status_code=500 when the 'git commit' or 'git add' operations fail.
        HTTPException: status_code=500 when the 'git push' operation to the remote repository fails.
        HTTPException: status_code=500 when the GitHub API returns a non-2xx response during pull request creation.

    Example:
        ```
        result = await fix_and_pr(
            FixAndPRRequest(
                repo_root='/home/user/projects/my-repo',
                functions=[FunctionRef(file_path='src/utils.py', function_name='process_data')],
                branch_name='wright/docs-update',
                pr_title='docs: add docstrings for process_data',
                github_token='ghp_abc123',
                style='google'
            ),
            request
        )
        print(result['pr_url'])  # https://github.com/owner/my-repo/pull/42
        ```
    """
    api_key = request.headers.get("X-Wright-API-Key", "")
    check_feature_flag(api_key, "auto_pr", raise_on_blocked=True)

    from api.chroma_cache import get as get_chroma
    from api.embedder import get_embedder
    from core.config import load_config
    from api.embedder import get_gateway
    from core.llm.prompts import DocStyle
    from core.output.injector import DocstringInjector
    from core.parser.dep_graph import DependencyGraph
    from core.parser.tree_sitter_parser import CodeParser
    from core.retrieval.hybrid_retriever import HybridRetriever

    repo_path = Path(body.repo_root)
    if not repo_path.exists():
        raise HTTPException(status_code=404, detail="Repo not found on server.")

    git_env = {**os.environ, "GIT_TERMINAL_PROMPT": "0", "GIT_ASKPASS": "echo"}

    # Get remote URL and parse owner/repo; auto-extract token if not provided
    remote_result = subprocess.run(
        ["git", "-C", str(repo_path), "remote", "get-url", "origin"],
        capture_output=True,
        text=True,
        timeout=10,
        env=git_env,
    )
    remote_url = remote_result.stdout.strip()
    try:
        owner, repo_name = _parse_github_owner_repo(remote_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    from api.routes.repos import load_token

    repo_slug = repo_path.name
    user_dir = repo_path.parent
    github_token = (
        body.github_token.strip()
        or load_token(user_dir, repo_slug)
        or _extract_token_from_url(remote_url)
        or ""
    )
    if not github_token:
        raise HTTPException(
            status_code=400,
            detail="No GitHub token found for this repo. Reconnect it with a GitHub token to enable PR creation.",
        )

    # Create a new branch
    branch = body.branch_name.strip() or f"wright/docs-{int(time.time())}"
    try:
        subprocess.run(
            ["git", "-C", str(repo_path), "checkout", "-b", branch],
            check=True,
            capture_output=True,
            timeout=15,
            env=git_env,
        )
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Failed to create branch: {e.stderr.decode()}")

    # Set up AI pipeline
    load_config(str(repo_path))
    parser = CodeParser()
    gateway = get_gateway()
    embedder = get_embedder()
    chroma_path = os.getenv("CHROMA_PATH", str(repo_path / ".wright" / "chroma"))
    chroma = get_chroma(chroma_path, str(repo_path))
    injector = DocstringInjector()
    doc_style = DocStyle(body.style)

    fixed: list[str] = []
    errors: list[str] = []
    # (fn_name, tokens, model) for each successfully injected function
    fixed_results: list[tuple[str, int, str]] = []
    total_duration_ms = 0
    total_retry_count = 0
    fallback_used = False
    last_model = ""

    for fn_ref in body.functions:
        try:
            parsed_file = parser.parse_file(fn_ref.file_path)
            func = None
            if fn_ref.function_name:
                for f in parsed_file.functions:
                    if f.name == fn_ref.function_name:
                        func = f
                        break
            elif parsed_file.functions:
                func = parsed_file.functions[0]

            if func is None:
                errors.append(f"`{fn_ref.function_name}` not found in {fn_ref.file_path}")
                continue

            dep_graph = DependencyGraph()
            dep_graph.build([parsed_file])
            retriever = HybridRetriever(chroma, dep_graph, embedder)
            context = retriever.retrieve_for_function(func)
            doc, llm_result = await gateway.generate_docstring(func, context, doc_style)
            total_duration_ms += llm_result.duration_ms
            total_retry_count += llm_result.retry_count
            fallback_used = fallback_used or llm_result.is_fallback
            last_model = llm_result.model
            result = injector.inject(func.file_path, func, doc, doc_style, dry_run=False)

            if result.success:
                fn_name = fn_ref.function_name or func.name
                fixed.append(fn_name)
                fixed_results.append((fn_name, llm_result.tokens, llm_result.model))
            else:
                errors.append(f"`{fn_ref.function_name}`: {result.error}")
        except Exception as e:
            errors.append(f"`{fn_ref.function_name or fn_ref.file_path}`: {e}")

    # If nothing was fixed, clean up branch and abort
    if not fixed:
        subprocess.run(
            ["git", "-C", str(repo_path), "checkout", "-"], capture_output=True, env=git_env
        )
        subprocess.run(
            ["git", "-C", str(repo_path), "branch", "-D", branch], capture_output=True, env=git_env
        )
        raise HTTPException(
            status_code=400, detail=f"No functions were fixed. Errors: {'; '.join(errors)}"
        )

    # Commit changes
    pr_title = body.pr_title.strip() or f"docs: add docstrings for {len(fixed)} function(s)"
    try:
        subprocess.run(
            ["git", "-C", str(repo_path), "add", "-A"],
            check=True,
            capture_output=True,
            timeout=10,
            env=git_env,
        )
        subprocess.run(
            [
                "git",
                "-C",
                str(repo_path),
                "-c",
                "user.email=wright@wrightai.dev",
                "-c",
                "user.name=Wright AI",
                "commit",
                "-m",
                pr_title,
                "--author",
                "Wright AI <wright@wrightai.dev>",
            ],
            check=True,
            capture_output=True,
            timeout=15,
            env=git_env,
        )
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"git commit failed: {e.stderr.decode()}")

    # Push branch using the resolved token
    push_url = f"https://{github_token}@github.com/{owner}/{repo_name}.git"
    try:
        subprocess.run(
            ["git", "-C", str(repo_path), "push", push_url, branch],
            check=True,
            capture_output=True,
            timeout=60,
            env=git_env,
        )
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"git push failed: {e.stderr.decode()}")

    # Create pull request via GitHub API
    base_branch = _get_default_branch(repo_path, git_env)
    pr_body = (
        f"Generated by [Wright AI](https://www.wrightai.live)\n\n"
        f"**{len(fixed)} function(s) documented:**\n"
        + "\n".join(f"- `{f}`" for f in fixed)
        + (
            f"\n\n**Skipped ({len(errors)}):**\n" + "\n".join(f"- {e}" for e in errors)
            if errors
            else ""
        )
    )

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://api.github.com/repos/{owner}/{repo_name}/pulls",
            headers={
                "Authorization": f"token {github_token}",
                "Accept": "application/vnd.github.v3+json",
            },
            json={"title": pr_title, "body": pr_body, "head": branch, "base": base_branch},
            timeout=15,
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail=f"PR creation failed: {resp.text}")

    from api.usage_store import record_event

    _api_key = request.headers.get("X-Wright-API-Key", "")
    # Record per-function token cost so analytics can break down by function
    for fn_name, fn_tokens, fn_model in fixed_results:
        record_event(
            _api_key,
            "docs_generated",
            tokens=fn_tokens,
            repo_name=repo_name,
            model=fn_model,
            doc_style=body.style,
        )
    # Record the PR creation as a separate event (no tokens — already counted above)
    record_event(
        _api_key,
        "fix_pr",
        repo_name=repo_name,
        model=last_model,
        is_fallback=fallback_used,
        retry_count=total_retry_count,
        duration_ms=total_duration_ms,
    )

    pr_data = resp.json()
    return {
        "pr_url": pr_data["html_url"],
        "pr_number": pr_data["number"],
        "branch": branch,
        "fixed": fixed,
        "errors": errors,
    }
