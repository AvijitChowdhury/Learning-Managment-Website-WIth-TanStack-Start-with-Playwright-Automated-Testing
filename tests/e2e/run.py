"""E2E test runner.

Runs every test in tests/test_*.py sequentially against a single authenticated
browser context, prints a pass/fail summary, and emits Allure-compatible
result JSON (+ per-test screenshot attachments) into tests/e2e/allure-results/
so `allure generate` / `allure serve` can render an HTML report.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import shutil
import sys
import time
import traceback
import uuid
from pathlib import Path

# Make sibling modules importable when run as `python tests/e2e/run.py`.
sys.path.insert(0, str(Path(__file__).parent))

from fixtures import SCREENSHOTS, make_browser, restore_supabase_session  # noqa: E402
from tests import (  # noqa: E402
    test_a11y,
    test_admin,
    test_auth_flow,
    test_dashboard,
    test_i18n,
    test_navigation,
    test_performance,
    test_public,
    test_responsive,
    test_seo,
)

ALL_TESTS = (
    test_public.TESTS
    + test_dashboard.TESTS
    + test_admin.TESTS
    + test_seo.TESTS
    + test_navigation.TESTS
    + test_a11y.TESTS
    + test_performance.TESTS
    + test_i18n.TESTS
    + test_auth_flow.TESTS
    + test_responsive.TESTS
)

ALLURE_DIR = Path(__file__).parent / "allure-results"

# Human-readable epic/severity mapping per suite.
SUITE_META: dict[str, dict[str, str]] = {
    "public": {"epic": "Public Site", "feature": "Marketing & Catalog", "severity": "critical"},
    "dashboard": {"epic": "Student Dashboard", "feature": "Learning Surface", "severity": "critical"},
    "admin": {"epic": "Admin Console", "feature": "Content & Ops", "severity": "blocker"},
    "seo": {"epic": "Public Site", "feature": "SEO & Metadata", "severity": "normal"},
    "nav": {"epic": "Public Site", "feature": "Routing & Navigation", "severity": "normal"},
    "a11y": {"epic": "Quality", "feature": "Accessibility", "severity": "normal"},
    "perf": {"epic": "Quality", "feature": "Performance", "severity": "minor"},
    "i18n": {"epic": "Public Site", "feature": "Localization (bn-BD)", "severity": "normal"},
    "auth": {"epic": "Authentication", "feature": "Session & Redirects", "severity": "critical"},
    "responsive": {"epic": "Quality", "feature": "Responsive Layout", "severity": "minor"},
}


def _reset_allure_dir() -> None:
    if ALLURE_DIR.exists():
        shutil.rmtree(ALLURE_DIR)
    ALLURE_DIR.mkdir(parents=True, exist_ok=True)


def _screenshot_index_for(name: str) -> Path | None:
    """Best-effort: find the screenshot(s) taken during this test."""
    # Screenshots are numbered/prefixed; match by test name suffix (e.g. admin.users_search → 21_admin_users)
    suffix = name.split(".", 1)[-1].replace("_", "").lower()
    for shot in sorted(SCREENSHOTS.glob("*.png")):
        stem = shot.stem.replace("_", "").lower()
        if suffix and suffix[:8] in stem:
            return shot
    return None


def _write_allure_result(
    name: str,
    passed: bool,
    detail: str,
    trace: str,
    start_ms: int,
    stop_ms: int,
) -> None:
    """Emit one Allure v2 result JSON + attach the test's screenshot."""
    suite = name.split(".", 1)[0]
    result_uuid = str(uuid.uuid4())
    attachments: list[dict] = []

    shot = _screenshot_index_for(name)
    if shot and shot.exists():
        att_name = f"{uuid.uuid4()}-attachment.png"
        shutil.copy(shot, ALLURE_DIR / att_name)
        attachments.append(
            {"name": f"{name} screenshot", "source": att_name, "type": "image/png"}
        )

    meta = SUITE_META.get(suite, {"epic": "Other", "feature": suite, "severity": "normal"})
    story = name.split(".", 1)[-1]
    result = {
        "uuid": result_uuid,
        "historyId": name,
        "name": name,
        "fullName": f"tests.e2e.{name}",
        "description": detail or f"Playwright E2E for {name}",
        "status": "passed" if passed else "failed",
        "statusDetails": {} if passed else {"message": detail, "trace": trace},
        "stage": "finished",
        "start": start_ms,
        "stop": stop_ms,
        "labels": [
            {"name": "suite", "value": suite},
            {"name": "parentSuite", "value": meta["epic"]},
            {"name": "subSuite", "value": meta["feature"]},
            {"name": "epic", "value": meta["epic"]},
            {"name": "feature", "value": meta["feature"]},
            {"name": "story", "value": story},
            {"name": "severity", "value": meta["severity"]},
            {"name": "framework", "value": "playwright-python"},
            {"name": "language", "value": "python"},
            {"name": "host", "value": "sandbox"},
        ],
        "attachments": attachments,
    }
    with (ALLURE_DIR / f"{result_uuid}-result.json").open("w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)


def _write_categories() -> None:
    """Custom defect categories for the Allure 'Categories' widget."""
    categories = [
        {"name": "Auth / session failures", "matchedStatuses": ["failed"],
         "messageRegex": ".*(/auth|Unauthorized|session|token).*"},
        {"name": "Missing UI selectors", "matchedStatuses": ["failed"],
         "messageRegex": ".*(Timeout|not visible|selector|wait_for).*"},
        {"name": "Assertion failures", "matchedStatuses": ["failed"],
         "messageRegex": ".*AssertionError.*"},
        {"name": "Network / 5xx", "matchedStatuses": ["failed", "broken"],
         "messageRegex": ".*(5\\d\\d|ECONN|fetch).*"},
    ]
    (ALLURE_DIR / "categories.json").write_text(
        json.dumps(categories, indent=2), encoding="utf-8"
    )


def _write_executor() -> None:
    executor = {
        "name": "Local Sandbox",
        "type": "shell",
        "buildName": f"E2E run {time.strftime('%Y-%m-%d %H:%M:%S')}",
        "reportName": "Shikho LMS — Playwright E2E",
    }
    (ALLURE_DIR / "executor.json").write_text(
        json.dumps(executor, indent=2), encoding="utf-8"
    )


def _write_environment_properties(status: str) -> None:
    """Populate the "Environment" widget in the Allure report."""
    import os

    lines = [
        f"BASE_URL={os.environ.get('BASE_URL', 'http://localhost:8080')}",
        f"AUTH={status}",
        f"PYTHON={sys.version.split()[0]}",
        f"RUN_AT={time.strftime('%Y-%m-%d %H:%M:%S %Z')}",
    ]
    (ALLURE_DIR / "environment.properties").write_text("\n".join(lines) + "\n")


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="substring filter on test name")
    ap.add_argument("--headed", action="store_true")
    ap.add_argument(
        "--no-allure",
        action="store_true",
        help="skip writing tests/e2e/allure-results/",
    )
    args = ap.parse_args()

    selected = [(n, fn) for n, fn in ALL_TESTS if args.only.lower() in n.lower()]
    if not selected:
        print(f"no tests match --only={args.only!r}")
        return 2

    if not args.no_allure:
        _reset_allure_dir()

    results: list[tuple[str, bool, str]] = []
    async with make_browser(headless=not args.headed) as ctx:
        status = await restore_supabase_session(ctx.context, ctx.page)
        print(f"[auth] {status}\n")
        if not args.no_allure:
            _write_environment_properties(status)

        for name, fn in selected:
            start_ms = int(time.time() * 1000)
            trace = ""
            try:
                detail = await fn(ctx.page) or ""
                stop_ms = int(time.time() * 1000)
                print(f"PASS  {name}  {detail}")
                results.append((name, True, detail))
                if not args.no_allure:
                    _write_allure_result(name, True, detail, "", start_ms, stop_ms)
            except Exception as e:
                stop_ms = int(time.time() * 1000)
                trace = traceback.format_exc()
                print(trace)
                msg = f"{type(e).__name__}: {str(e)[:200]}"
                print(f"FAIL  {name}  {msg}")
                results.append((name, False, msg))
                if not args.no_allure:
                    _write_allure_result(name, False, msg, trace, start_ms, stop_ms)

        interesting = [
            e
            for e in ctx.errors
            if "hydrat" not in e and "Failed to fetch" not in e
        ]

    passed = sum(1 for _, ok, _ in results if ok)
    failed = len(results) - passed
    print("\n" + "=" * 60)
    print(f" SUMMARY  {passed}/{len(results)} passed, {failed} failed")
    print("=" * 60)
    for name, ok, detail in results:
        marker = "PASS" if ok else "FAIL"
        print(f"  [{marker}] {name}: {detail}")
    if interesting:
        print(f"\nNoteworthy console/page errors ({len(interesting)}):")
        seen = set()
        for e in interesting:
            key = e[:80]
            if key in seen:
                continue
            seen.add(key)
            print(" -", e[:240])
    if not args.no_allure:
        print(f"\nAllure results written to {ALLURE_DIR}")
        print("Render report: nix run nixpkgs#allure -- serve tests/e2e/allure-results")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
