"""Public (unauthenticated) surfaces: landing, courses, free-class, checkout error."""
from __future__ import annotations

import os
from fixtures import BASE_URL, shot

COURSE_SLUG = os.environ.get("TEST_COURSE_SLUG", "web-dev-basics")


async def landing(page):
    await page.goto(BASE_URL, wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle", timeout=8000)
    await shot(page, "01_landing")
    html = await page.content()
    for kw in ("চেকআউট", "মডিউল", "ফ্রি"):
        assert kw in html, f"landing missing '{kw}'"
    return "hero + 3 CTAs present"


async def landing_ctas_link_correctly(page):
    await page.goto(BASE_URL, wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle", timeout=8000)
    results = {}
    for expected in ("/free-class", "/courses"):
        hrefs = await page.eval_on_selector_all(
            "a", "els => els.map(e => e.getAttribute('href') || '')"
        )
        results[expected] = any(expected in h for h in hrefs)
    missing = [k for k, v in results.items() if not v]
    assert not missing, f"missing landing CTA targets: {missing}"
    return f"resolved links: {list(results)}"


async def courses_list(page):
    await page.goto(f"{BASE_URL}/courses", wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle", timeout=8000)
    await shot(page, "02_courses_list")
    hrefs = await page.eval_on_selector_all(
        "a[href^='/courses/']", "els => els.map(e => e.getAttribute('href'))"
    )
    assert any(h and h.count("/") >= 2 for h in hrefs), "no course cards render"
    return f"{len(hrefs)} course links"


async def course_detail(page):
    await page.goto(f"{BASE_URL}/courses/{COURSE_SLUG}", wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle", timeout=8000)
    await shot(page, "03_course_detail")
    html = await page.content()
    assert COURSE_SLUG in page.url
    assert len(html) > 3000, "detail page too small"
    return f"len={len(html)}"


async def free_class(page):
    await page.goto(f"{BASE_URL}/free-class", wait_until="domcontentloaded")
    await shot(page, "04_free_class")
    assert page.url.endswith("/free-class")
    return page.url


async def checkout_error(page):
    await page.goto(f"{BASE_URL}/checkout/error", wait_until="domcontentloaded")
    await shot(page, "05_checkout_error")
    html = await page.content()
    assert len(html) > 1000
    return "renders"


TESTS = [
    ("public.landing", landing),
    ("public.landing_ctas", landing_ctas_link_correctly),
    ("public.courses_list", courses_list),
    ("public.course_detail", course_detail),
    ("public.free_class", free_class),
    ("public.checkout_error", checkout_error),
]
