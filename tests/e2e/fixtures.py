"""Shared browser + auth fixtures for the E2E suite."""
from __future__ import annotations

import json
import os
import urllib.request
from pathlib import Path
from playwright.async_api import BrowserContext, Page, async_playwright

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080")
SUPABASE_URL = os.environ.get(
    "VITE_SUPABASE_URL", "https://gsfqyguifeexomellfer.supabase.co"
)
SUPABASE_ANON_KEY = os.environ.get(
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZnF5Z3VpZmVleG9tZWxsZmVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDM0MzcsImV4cCI6MjA5ODY3OTQzN30.IhK_RWDP51-fefs5PrDjtlB4BTjeerUMlwmos3ogri4",
)
SCREENSHOTS = Path(__file__).parent / "screenshots"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)


def _project_ref_from_url(url: str) -> str:
    try:
        return url.split("//", 1)[1].split(".", 1)[0]
    except Exception:
        return "project"


def _fetch_supabase_session(email: str, password: str) -> dict | None:
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    body = json.dumps({"email": email, "password": password}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"[fixtures] supabase login HTTP error: {e}")
        return None


async def restore_supabase_session(context: BrowserContext, page: Page) -> str:
    """Restore an auth session so authenticated routes work."""
    key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    session = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    cookies = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")

    if cookies:
        arr = json.loads(cookies)
        for c in arr:
            c["url"] = BASE_URL
        await context.add_cookies(arr)

    await page.goto(BASE_URL, wait_until="domcontentloaded")
    try:
        await page.wait_for_load_state("networkidle", timeout=5000)
    except Exception:
        pass

    if key and session:
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(key)}, {json.dumps(session)})"
        )
        return "session restored from injected vars"

    email = os.environ.get("E2E_EMAIL")
    password = os.environ.get("E2E_PASSWORD")
    if email and password:
        sess = _fetch_supabase_session(email, password)
        if not sess or "access_token" not in sess:
            return f"REST login failed for {email}"
        ref = _project_ref_from_url(SUPABASE_URL)
        storage_key = f"sb-{ref}-auth-token"
        payload = json.dumps(sess)
        await page.evaluate(
            "([k, v]) => window.localStorage.setItem(k, v)",
            [storage_key, payload],
        )
        await page.goto(BASE_URL, wait_until="domcontentloaded")
        try:
            await page.wait_for_load_state("networkidle", timeout=5000)
        except Exception:
            pass
        return f"signed in via REST as {email}"

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
