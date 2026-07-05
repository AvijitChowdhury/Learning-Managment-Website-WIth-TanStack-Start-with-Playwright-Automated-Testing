"""Shared browser + auth fixtures for the E2E suite."""
from __future__ import annotations

import json
import os
from pathlib import Path
from playwright.async_api import BrowserContext, Page, async_playwright

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080")
SCREENSHOTS = Path(__file__).parent / "screenshots"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)


async def restore_supabase_session(context: BrowserContext, page: Page) -> str:
    """Restore the injected Supabase session so authenticated routes work.

    Returns a short status string suitable for logging.
    """
    key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    session = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    cookies = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")

    if cookies:
        arr = json.loads(cookies)
        for c in arr:
            c["url"] = BASE_URL
        await context.add_cookies(arr)

    await page.goto(BASE_URL, wait_until="domcontentloaded")

    if key and session:
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(key)}, {json.dumps(session)})"
        )
        return "session restored"
    return "no session vars — running unauthenticated"


def make_browser(headless: bool = True):
    """Return an async context manager yielding (playwright, browser, context, page)."""

    class _Ctx:
        async def __aenter__(self):
            self._pw = await async_playwright().start()
            self.browser = await self._pw.chromium.launch(headless=headless)
            self.context = await self.browser.new_context(
                viewport={"width": 1280, "height": 1800}
            )
            self.page = await self.context.new_page()
            self.errors: list[str] = []
            self.page.on("pageerror", lambda e: self.errors.append(f"pageerror: {e}"))
            self.page.on(
                "console",
                lambda m: self.errors.append(f"console.{m.type}: {m.text}")
                if m.type == "error"
                else None,
            )
            return self

        async def __aexit__(self, exc_type, exc, tb):
            await self.browser.close()
            await self._pw.stop()

    return _Ctx()


async def shot(page: Page, name: str) -> None:
    try:
        await page.screenshot(path=str(SCREENSHOTS / f"{name}.png"))
    except Exception as e:  # never let screenshots kill a test
        print(f"screenshot {name} failed: {e}")
