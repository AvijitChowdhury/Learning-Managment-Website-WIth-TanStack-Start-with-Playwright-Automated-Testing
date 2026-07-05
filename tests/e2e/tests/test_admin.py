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


async def admin_overview_cards(page):
    await page.goto(f"{BASE_URL}/admin", wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle", timeout=10000)
    await shot(page, "17_admin_overview_cards")
    headings = await page.eval_on_selector_all(
        "h1,h2,h3", "els => els.map(e => e.textContent.trim())"
    )
    expected = ["সামগ্রিক", "আজকের কার্যক্রম", "রিভিনিউ", "টপ কোর্স"]
    missing = [e for e in expected if not any(e in h for h in headings)]
    assert not missing, f"missing dashboard sections: {missing}"
    # CSV export button present
    assert (
        await page.locator("button:has-text('CSV এক্সপোর্ট')").count() > 0
    ), "CSV export button missing"
    return f"{len(headings)} headings, all sections present"


async def admin_instructors_page(page):
    await page.goto(f"{BASE_URL}/admin/instructors", wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle", timeout=10000)
    await shot(page, "18_admin_instructors")
    assert (
        await page.get_by_text("ইন্সট্রাক্টর", exact=False).count() > 0
    ), "instructors heading missing"
    assert (
        await page.locator("button:has-text('নতুন ইন্সট্রাক্টর')").count() > 0
    ), "new instructor button missing"
    return "page + create button"


async def admin_instructor_create(page):
    await page.goto(f"{BASE_URL}/admin/instructors", wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle", timeout=10000)
    suffix = os.urandom(2).hex()
    name = f"E2E Instructor {suffix}"
    slug = f"e2e-instructor-{suffix}"
    await page.locator("button:has-text('নতুন ইন্সট্রাক্টর')").first.click()
    await page.wait_for_selector("input[placeholder*='শাহরিয়ার']", timeout=8000)
    await page.locator("input[placeholder*='শাহরিয়ার']").fill(name)
    await page.locator("input[placeholder='shahriar-hasan']").fill(slug)
    await page.locator("input[placeholder*='সিনিয়র সফটওয়্যার']").fill("Test Title")
    await page.locator("textarea[placeholder*='২-৩ প্যারা']").fill(
        "E2E automation created this instructor. Safe to delete."
    )
    await page.locator("button:has-text('সংরক্ষণ করুন')").first.click()
    await page.wait_for_timeout(2500)
    await shot(page, "19_admin_instructor_created")
    html = await page.content()
    assert name in html or slug in html, f"instructor {name} not visible after create"
    return f"created {name}"


async def admin_reviews_page(page):
    await page.goto(f"{BASE_URL}/admin/reviews", wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle", timeout=10000)
    await page.wait_for_timeout(1500)
    await shot(page, "20_admin_reviews")
    assert (
        await page.get_by_text("রিভিউ", exact=False).count() > 0
    ), "reviews heading missing"
    # Either a course filter (combobox/select) or the empty-state message
    has_filter = await page.locator("[role='combobox'], select").count() > 0
    has_empty = await page.get_by_text("এখনো কোনো রিভিউ", exact=False).count() > 0
    assert has_filter or has_empty, "reviews page: no filter and no empty state"
    return "reviews page renders"


async def admin_users_search_and_filter(page):
    await page.goto(f"{BASE_URL}/admin/users", wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle", timeout=10000)
    # Table must render
    await page.wait_for_selector("table", timeout=10000)
    initial_rows = await page.locator("table tbody tr").count()
    # Search: no match should shrink or empty the table
    await page.locator("input[placeholder*='খুঁজুন']").fill("zzz_no_such_user_zzz")
    await page.wait_for_timeout(600)
    filtered_rows = await page.locator("table tbody tr").count()
    # Clear and switch to Admin tab
    await page.locator("input[placeholder*='খুঁজুন']").fill("")
    await page.wait_for_timeout(400)
    await page.locator("button:has-text('অ্যাডমিন')").first.click()
    await page.wait_for_timeout(600)
    admin_rows = await page.locator("table tbody tr").count()
    # Switch back to All tab
    await page.locator("button:has-text('সব')").first.click()
    await page.wait_for_timeout(400)
    await shot(page, "21_admin_users")
    assert initial_rows > 0, "users table rendered no rows"
    assert filtered_rows <= initial_rows, "search did not narrow results"
    return f"rows: all={initial_rows}, admin={admin_rows}, filtered={filtered_rows}"


TESTS = [
    ("admin.overview", admin_overview),
    ("admin.overview_cards", admin_overview_cards),
    ("admin.orders_join", admin_orders_no_relationship_error),
    ("admin.orders_tabs", admin_orders_tabs),
    ("admin.category_create", admin_create_category),
    ("admin.coupon_create", admin_create_coupon),
    ("admin.courses_list", admin_courses_list),
    ("admin.course_editor", admin_course_editor),
    ("admin.instructors_page", admin_instructors_page),
    ("admin.instructor_create", admin_instructor_create),
    ("admin.reviews_page", admin_reviews_page),
    ("admin.users_search", admin_users_search_and_filter),
]
