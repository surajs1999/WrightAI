#!/usr/bin/env python3
"""GitHub Action entrypoint for Wright documentation checks."""
from __future__ import annotations

import asyncio
import json
import os
import subprocess
import sys

from dotenv import load_dotenv

load_dotenv()

WRIGHT_MODE = os.getenv("WRIGHT_MODE", "coverage")
WRIGHT_THRESHOLD = float(os.getenv("WRIGHT_THRESHOLD", "0.7"))
WRIGHT_AUTO_PR = os.getenv("WRIGHT_AUTO_PR", "false").lower() == "true"
WRIGHT_PATH = os.getenv("WRIGHT_PATH", ".")
GITHUB_STEP_SUMMARY = os.getenv("GITHUB_STEP_SUMMARY", "")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_REPOSITORY = os.getenv("GITHUB_REPOSITORY", "")
GITHUB_REF = os.getenv("GITHUB_REF", "main")


def write_summary(content: str) -> None:
    if GITHUB_STEP_SUMMARY:
        with open(GITHUB_STEP_SUMMARY, "a") as f:
            f.write(content + "\n")


def set_output(name: str, value: str) -> None:
    github_output = os.getenv("GITHUB_OUTPUT", "")
    if github_output:
        with open(github_output, "a") as f:
            f.write(f"{name}={value}\n")
    else:
        print(f"::set-output name={name}::{value}")


def run_coverage() -> None:
    from core.config import load_config
    from core.parser.tree_sitter_parser import CodeParser

    path_abs = os.path.abspath(WRIGHT_PATH)
    config = load_config(path_abs)
    parser = CodeParser()
    parsed_files = parser.parse_directory(path_abs, exclude=config.exclude)

    total = 0
    documented = 0
    undoc_list = []

    for pf in parsed_files:
        for func in pf.functions:
            total += 1
            if func.existing_docstring:
                documented += 1
            else:
                undoc_list.append((func.name, pf.path, func.start_line + 1))

    pct = (documented / total * 100) if total else 100.0
    print(f"\n📊 Documentation Coverage: {pct:.1f}%")
    print(f"   Documented: {documented}/{total} functions")

    if undoc_list:
        print(f"\n❌ Undocumented functions ({len(undoc_list)}):")
        for name, filepath, line in undoc_list[:20]:
            print(f"   • {name} ({filepath}:{line})")
        if len(undoc_list) > 20:
            print(f"   ... and {len(undoc_list) - 20} more")

    summary = f"""## Wright Documentation Coverage

| Metric | Value |
|--------|-------|
| Coverage | {pct:.1f}% |
| Documented | {documented} |
| Total | {total} |
| Threshold | {WRIGHT_THRESHOLD * 100:.0f}% |

"""
    if pct < WRIGHT_THRESHOLD * 100:
        summary += f"❌ Coverage {pct:.1f}% is below threshold {WRIGHT_THRESHOLD * 100:.0f}%\n"
    else:
        summary += f"✅ Coverage meets the {WRIGHT_THRESHOLD * 100:.0f}% threshold\n"

    write_summary(summary)
    set_output("coverage-pct", f"{pct:.1f}")

    if pct < WRIGHT_THRESHOLD * 100:
        print(f"\n❌ Coverage {pct:.1f}% is below threshold {WRIGHT_THRESHOLD * 100:.0f}%")
        sys.exit(1)
    else:
        print(f"\n✅ Coverage meets threshold!")


def run_generate() -> None:
    from core.config import load_config
    from core.llm.gateway import LLMGateway
    from core.output.injector import DocstringInjector
    from core.parser.dep_graph import DependencyGraph
    from core.parser.tree_sitter_parser import CodeParser

    path_abs = os.path.abspath(WRIGHT_PATH)
    config = load_config(path_abs)
    parser = CodeParser()
    parsed_files = parser.parse_directory(path_abs, exclude=config.exclude)

    gateway = LLMGateway(anthropic_key=os.getenv("ANTHROPIC_API_KEY", ""))
    injector = DocstringInjector()

    async def _generate() -> int:
        from core.embeddings.chroma_store import ChromaStore
        from core.embeddings.voyage_embeddings import VoyageEmbedder
        from core.retrieval.hybrid_retriever import HybridRetriever

        embedder = VoyageEmbedder(api_key=os.getenv("VOYAGE_API_KEY", ""))
        chroma = ChromaStore(
            persist_path=os.path.join(path_abs, ".wright", "chroma"),
            repo_root=path_abs,
        )
        dep_graph = DependencyGraph()
        dep_graph.build(parsed_files)
        retriever = HybridRetriever(chroma, dep_graph, embedder)

        count = 0
        undoc = [(pf, f) for pf in parsed_files for f in pf.functions if not f.existing_docstring]
        print(f"Generating docs for {len(undoc)} functions...")

        for pf, func in undoc:
            context = retriever.retrieve_for_function(func)
            doc = await gateway.generate_docstring(func, context, config.style)
            result = injector.inject(func.file_path, func, doc, config.style)
            if result.success:
                count += 1
                print(f"  ✓ {func.name} ({func.file_path}:{func.start_line + 1})")
        return count

    count = asyncio.run(_generate())
    print(f"\n✅ Generated docs for {count} functions")

    # Commit changes
    try:
        subprocess.run(["git", "config", "user.email", "wright-bot@github.com"], check=True)
        subprocess.run(["git", "config", "user.name", "Wright Bot"], check=True)
        subprocess.run(["git", "add", "-A"], check=True)
        result = subprocess.run(["git", "diff", "--cached", "--quiet"])
        if result.returncode != 0:
            subprocess.run(
                ["git", "commit", "-m", f"docs: auto-generate documentation for {count} functions [wright-bot]"],
                check=True,
            )
            print("✅ Changes committed")
        else:
            print("No changes to commit")
    except subprocess.CalledProcessError as e:
        print(f"Warning: Could not commit: {e}")


def run_drift() -> None:
    from core.drift.drift_detector import DriftDetector
    from core.parser.cache import ASTCache

    path_abs = os.path.abspath(WRIGHT_PATH)
    cache = ASTCache(os.path.join(path_abs, ".wright", "ast_cache.db"))
    detector = DriftDetector()

    try:
        results = detector.check_git_diff(path_abs, base_ref="HEAD~1")
    except Exception:
        results = detector.check_directory(path_abs, cache)

    drifted = [r for r in results if r.status in ("drifted", "undocumented")]

    print(f"\n📊 Drift Check Results")
    print(f"   Total checked: {len(results)}")
    print(f"   Drifted/undocumented: {len(drifted)}")

    if drifted:
        print("\n⚠️  Functions needing documentation updates:")
        for r in drifted[:20]:
            print(f"   • {r.function_name} ({r.file_path}) — {r.status}")

    summary = f"""## Wright Drift Check

| Metric | Value |
|--------|-------|
| Total checked | {len(results)} |
| Drifted | {sum(1 for r in results if r.status == 'drifted')} |
| Undocumented | {sum(1 for r in results if r.status == 'undocumented')} |
| Up to date | {sum(1 for r in results if r.status == 'up_to_date')} |
"""
    write_summary(summary)
    set_output("drifted-functions", str(len(drifted)))

    if WRIGHT_AUTO_PR and drifted and GITHUB_TOKEN:
        _open_pr(drifted)


def _open_pr(drifted: list) -> None:
    import httpx
    branch_name = "wright/fix-doc-drift"
    try:
        subprocess.run(["git", "checkout", "-b", branch_name], check=True)
        subprocess.run(["git", "config", "user.email", "wright-bot@github.com"], check=True)
        subprocess.run(["git", "config", "user.name", "Wright Bot"], check=True)
        # Note: actual docstring regeneration would happen here
        pr_body = "## Wright Documentation Drift Fix\n\nThis PR updates documentation for functions that have drifted.\n\nGenerated by [Wright](https://github.com/wright)."
        headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
        }
        payload = {
            "title": f"docs: fix documentation drift ({len(drifted)} functions)",
            "body": pr_body,
            "head": branch_name,
            "base": "main",
        }
        resp = httpx.post(
            f"https://api.github.com/repos/{GITHUB_REPOSITORY}/pulls",
            json=payload,
            headers=headers,
        )
        if resp.status_code == 201:
            pr_url = resp.json()["html_url"]
            print(f"✅ PR opened: {pr_url}")
            set_output("pr-url", pr_url)
        else:
            print(f"Warning: Could not open PR: {resp.text}")
    except Exception as e:
        print(f"Warning: PR creation failed: {e}")


if __name__ == "__main__":
    if WRIGHT_MODE == "coverage":
        run_coverage()
    elif WRIGHT_MODE == "generate":
        run_generate()
    elif WRIGHT_MODE == "drift":
        run_drift()
    else:
        print(f"Unknown mode: {WRIGHT_MODE}. Use 'coverage', 'generate', or 'drift'.")
        sys.exit(1)
