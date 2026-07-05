"""Admin surfaces including real create/read mutations."""
from __future__ import annotations

import os
from fixtures import BASE_URL, shot


async def admin_overview(page):
    await page.goto(f"{BASE_URL}/admin", wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle", timeout=10000)
    await shot(page, "10_admin_overview")
    assert "/auth" not in page.url, "not admin?"
    html = await page.content()
    assert any(k in html for k in ("মোট", "Total", "অর্ডার", "কোর্স"))
    return f"len={len(html)}"


async def admin_orders_no_relationship_error(page):
    await page.goto(f"{BASE_URL}/admin/orders", wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle", timeout=15000)
    await shot(page, "11_admin_orders")
    html = await page.content()
    assert "Could not find a relationship" not in html, "orders join regression"
    return "clean"


async def admin_orders_tabs(page):
    await page.goto(f"{BASE_URL}/admin/orders", wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle", timeout=15000)
    for label in ("সব", "অসম্পূর্ণ", "পেইড"):
        await page.locator(f"button:has-text('{label}')").first.click(timeout=3000)
        await page.wait_for_timeout(300)
    await shot(page, "12_admin_orders_paid")
    return "all three tabs clicked"


async def admin_create_category(page):
    await page.goto(f"{BASE_URL}/admin/categories", wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle", timeout=8000)
    suffix = os.urandom(2).hex()
    name, slug = f"E2E-{suffix}", f"e2e-{suffix}"
    await page.locator("input[placeholder='নাম']").fill(name)
    await page.locator("input[placeholder*='slug']").fill(slug)
    await page.locator("button:has-text('যোগ করুন')").first.click()
    await page.wait_for_timeout(1500)
    await shot(page, "13_admin_categories")
    html = await page.content()
    assert name in html or slug in html, "new category not visible after create"
    return f"created {name}"


async def admin_create_coupon(page):
    await page.goto(f"{BASE_URL}/admin/coupons", wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle", timeout=8000)
    code = f"E2E{os.urandom(2).hex().upper()}"
    await page.locator("input[placeholder*='কোড']").fill(code)
    await page.locator("input[placeholder='ভ্যালু']").fill("10")
    await page.locator("button:has-text('কুপন যোগ')").first.click()
    await page.wait_for_timeout(1500)
    await shot(page, "14_admin_coupons")
    html = await page.content()
    assert code in html, f"coupon {code} not visible after create"
    return f"created {code}"


async def admin_courses_list(page):
    await page.goto(f"{BASE_URL}/admin/courses", wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle", timeout=8000)
    await shot(page, "15_admin_courses")
    hrefs = await page.eval_on_selector_all(
        "a[href*='/admin/courses/']", "els => els.map(e => e.getAttribute('href'))"
    )
    edits = [h for h in hrefs if h and h.endswith("/edit")]
    assert edits, "no edit links visible"
    return f"{len(edits)} edit links"


async def admin_course_editor(page):
    course_id = os.environ.get("TEST_COURSE_ID")
    if not course_id:
        # derive from the list page
        await page.goto(f"{BASE_URL}/admin/courses", wait_until="domcontentloaded")
        # wait for at least one edit link to render, not just networkidle
        try:
            await page.wait_for_selector("a[href$='/edit']", timeout=15000)
        except Exception:
            pass
        hrefs = await page.eval_on_selector_all(
            "a[href*='/admin/courses/']", "els => els.map(e => e.getAttribute('href'))"
        )
        edit = next((h for h in hrefs if h and h.endswith("/edit")), None)
        assert edit, "no course to edit"
        await page.goto(BASE_URL + edit, wait_until="domcontentloaded")
    else:
        await page.goto(
            f"{BASE_URL}/admin/courses/{course_id}/edit", wait_until="domcontentloaded"
        )
    await page.wait_for_selector(
        "input[placeholder='নতুন মডিউলের নাম']", timeout=15000
    )
    await shot(page, "16_admin_course_editor")
    inputs = await page.eval_on_selector_all("input", "els => els.length")
    assert inputs > 0, "editor rendered no inputs"
    return f"{inputs} inputs"


TESTS = [
    ("admin.overview", admin_overview),
    ("admin.orders_join", admin_orders_no_relationship_error),
    ("admin.orders_tabs", admin_orders_tabs),
    ("admin.category_create", admin_create_category),
    ("admin.coupon_create", admin_create_coupon),
    ("admin.courses_list", admin_courses_list),
    ("admin.course_editor", admin_course_editor),
]
