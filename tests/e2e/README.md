# End-to-End Test Suite

Full Playwright test project for the LMS website. Covers landing page, public
courses, checkout error, student dashboard, support forum, and every admin
surface (overview, categories, coupons, orders, courses list, course editor).

## Setup

```bash
python -m pip install --no-cache-dir playwright
python -m playwright install chromium
```

## Environment variables

The suite talks to your local dev server and restores a real Supabase session
so authenticated + admin routes are exercised.

| Variable | Purpose |
|---|---|
| `BASE_URL` | App under test. Default `http://localhost:8080`. |
| `LOVABLE_BROWSER_SUPABASE_STORAGE_KEY` | `sb-<project>-auth-token` — Supabase JS localStorage key. |
| `LOVABLE_BROWSER_SUPABASE_SESSION_JSON` | Full Supabase session JSON. |
| `LOVABLE_BROWSER_SUPABASE_COOKIES_JSON` | Optional `@supabase/ssr` cookie array. |
| `TEST_COURSE_ID` | UUID of any published course (used by the course-editor test). |
| `TEST_COURSE_SLUG` | Slug of any published course. Default `web-dev-basics`. |

Inside the Lovable sandbox these vars are already injected — just run the
suite. Outside the sandbox, log in once via the browser and copy the session
values from `localStorage` on the app origin.

## Run

```bash
python tests/e2e/run.py                 # full suite, summary at the end
python tests/e2e/run.py --only orders   # run only tests matching "orders"
python tests/e2e/run.py --headed        # run non-headless
```

Screenshots for every step land in `tests/e2e/screenshots/`.

## Layout

```
tests/e2e/
  run.py                   # test runner + reporter
  fixtures.py              # browser + auth restore
  tests/
    test_public.py         # landing, courses list/detail, free-class, checkout error
    test_dashboard.py      # student dashboard, support
    test_admin.py          # admin overview + categories/coupons/orders/courses CRUD
```

Each test module exports `TESTS: list[tuple[name, async_fn(page)]]` which
`run.py` picks up and executes sequentially against a single authenticated
browser context.
