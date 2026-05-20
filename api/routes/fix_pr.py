from __future__ import annotations

import os
import subprocess
import time
from pathlib import Path

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from api.auth import verify_api_key

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
    """Extract embedded token from https://TOKEN@github.com/... URLs."""
    url = remote_url.strip()
    if url.startswith("https://") and "@github.com" in url:
        after_scheme = url[len("https://") :]
        token = after_scheme.split("@")[0]
        if token and token != "github.com":
            return token
    return None


def _parse_github_owner_repo(remote_url: str) -> tuple[str, str]:
    """Extract owner and repo name from a GitHub remote URL."""
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
    Retrieves the default branch name of a Git repository from the remote origin HEAD reference.

    Attempts to determine the repository's default branch by querying the symbolic reference of refs/remotes/origin/HEAD using Git. If the query fails or returns a non-zero exit code, defaults to 'main' as the branch name.

    Args:
        repo_path (Path): The filesystem path to the Git repository.
        git_env (dict): Environment variables dictionary to pass to the Git subprocess execution.

    Returns:
        str: The name of the default branch (e.g., 'main', 'master') extracted from the symbolic reference, or 'main' if the reference cannot be determined.

    Raises:
        subprocess.TimeoutExpired: When the Git command execution exceeds the 10-second timeout.

    Example:
        ```
        branch = _get_default_branch(Path('/path/to/repo'), {'GIT_AUTHOR_NAME': 'Bot'})
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

    This endpoint orchestrates the complete workflow of AI-powered documentation generation: it validates the repository, extracts GitHub credentials, creates a new branch, generates docstrings using LLM and retrieval-augmented generation for each specified function, injects them into the codebase, commits the changes, pushes the branch, and finally creates a pull request via the GitHub API.

    Args:
        body (FixAndPRRequest): Request body containing repo_root path, list of functions to document with their file paths and names, optional branch_name, pr_title, github_token, and documentation style preference.
        request (Request): FastAPI Request object representing the incoming HTTP request.

    Returns:
        dict: Dictionary containing pr_url (the GitHub PR URL), pr_number (integer PR number), branch (branch name created), fixed (list of successfully documented function names), and errors (list of error messages for failed functions).

    Raises:
        HTTPException: When status_code=404 if the repository path does not exist on the server.
        HTTPException: When status_code=400 if the GitHub owner/repo cannot be parsed from the remote URL.
        HTTPException: When status_code=400 if no GitHub token is found or provided for PR creation.
        HTTPException: When status_code=500 if Git branch creation fails.
        HTTPException: When status_code=400 if no functions were successfully fixed and documented.
        HTTPException: When status_code=500 if Git commit or push operations fail.
        HTTPException: When status_code=500 if GitHub API pull request creation fails.

    Example:
        ```
        result = await fix_and_pr(FixAndPRRequest(repo_root='/path/to/repo', functions=[FunctionRef(file_path='main.py', function_name='process_data')], style='google'), request)
        ```
    """
    from core.config import load_config
    from core.embeddings.chroma_store import ChromaStore
    from core.embeddings.voyage_embeddings import VoyageEmbedder
    from core.llm.gateway import LLMGateway
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
    gateway = LLMGateway(anthropic_key=os.getenv("ANTHROPIC_API_KEY", ""))
    embedder = VoyageEmbedder(api_key=os.getenv("VOYAGE_API_KEY", ""))
    chroma_path = os.getenv("CHROMA_PATH", str(repo_path / ".wright" / "chroma"))
    chroma = ChromaStore(persist_path=chroma_path, repo_root=str(repo_path))
    injector = DocstringInjector()
    doc_style = DocStyle(body.style)

    fixed: list[str] = []
    errors: list[str] = []

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
            doc = await gateway.generate_docstring(func, context, doc_style)
            result = injector.inject(func.file_path, func, doc, doc_style, dry_run=False)

            if result.success:
                fixed.append(fn_ref.function_name or func.name)
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

    pr_data = resp.json()
    return {
        "pr_url": pr_data["html_url"],
        "pr_number": pr_data["number"],
        "branch": branch,
        "fixed": fixed,
        "errors": errors,
    }
