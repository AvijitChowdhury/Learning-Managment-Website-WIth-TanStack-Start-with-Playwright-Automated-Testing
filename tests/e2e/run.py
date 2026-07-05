"""E2E test runner.

Runs every test in tests/test_*.py sequentially against a single authenticated
browser context and prints a colored pass/fail summary at the end.
"""
from __future__ import annotations

import argparse
import asyncio
import sys
import traceback
from pathlib import Path

# Make sibling modules importable when run as `python tests/e2e/run.py`.
sys.path.insert(0, str(Path(__file__).parent))

from fixtures import make_browser, restore_supabase_session  # noqa: E402
from tests import test_admin, test_dashboard, test_public  # noqa: E402

ALL_TESTS = test_public.TESTS + test_dashboard.TESTS + test_admin.TESTS


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="substring filter on test name")
    ap.add_argument("--headed", action="store_true")
    args = ap.parse_args()

    selected = [(n, fn) for n, fn in ALL_TESTS if args.only.lower() in n.lower()]
    if not selected:
        print(f"no tests match --only={args.only!r}")
        return 2

    results: list[tuple[str, bool, str]] = []
    async with make_browser(headless=not args.headed) as ctx:
        status = await restore_supabase_session(ctx.context, ctx.page)
        print(f"[auth] {status}\n")

        for name, fn in selected:
            try:
                detail = await fn(ctx.page) or ""
                print(f"PASS  {name}  {detail}")
                results.append((name, True, detail))
            except Exception as e:
                traceback.print_exc()
                msg = f"{type(e).__name__}: {str(e)[:200]}"
                print(f"FAIL  {name}  {msg}")
                results.append((name, False, msg))

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
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
