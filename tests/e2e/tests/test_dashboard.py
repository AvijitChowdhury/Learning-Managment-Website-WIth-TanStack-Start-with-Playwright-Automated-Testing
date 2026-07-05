"""Signed-in student surfaces."""
from __future__ import annotations

from fixtures import BASE_URL, shot


async def dashboard(page):
    await page.goto(f"{BASE_URL}/dashboard", wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle", timeout=8000)
    await shot(page, "06_dashboard")
    assert "/auth" not in page.url, "unexpected redirect to /auth — session missing?"
    return page.url


async def support_forum(page):
    await page.goto(f"{BASE_URL}/dashboard/support", wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle", timeout=8000)
    await shot(page, "07_support")
    assert "/auth" not in page.url
    return "reachable"


TESTS = [
    ("dashboard.overview", dashboard),
    ("dashboard.support", support_forum),
]
