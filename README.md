# শিখো — Bengali LMS Platform

A full-stack Learning Management System built with **TanStack Start**, **React 19**, **Supabase**, and **Tailwind CSS v4**. Ships with student learning surfaces, an admin CMS, coupon-aware checkout via **UddoktaPay**, and a peer support forum — all in Bengali.

Live: [lmsavi.lovable.app](https://lmsavi.lovable.app)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Server Functions](#server-functions)
- [Payments](#payments)
- [Authentication & Roles](#authentication--roles)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Features

### Public / Marketing
- **Landing page** with three primary CTAs — Checkout, Course Modules, Free Demo Class.
- **Course catalog** (`/courses`) with published-only listings and category filters.
- **Course detail page** (`/courses/:slug`) with hero, intro video (YouTube-aware), "what you'll learn" checklist, bonus gift resources, curriculum outline, and reviews.
- **Free demo class landing** (`/free-class`) for lead capture.

### Student Experience
- **Dashboard** (`/dashboard`) — enrolled courses, progress, recent orders.
- **Course player** (`/dashboard/courses/:id`) — module/lesson tree, video player, assignment box, downloadable resources, per-lesson progress tracking.
- **My Orders** (`/dashboard/orders`).
- **Support Forum** (`/dashboard/support`) — threaded Q&A between students.
- **Profile** (`/dashboard/profile`).

### Checkout & Payments
- Coupon input with **server-side re-validation** (active flag, date window, `max_uses`).
- **UddoktaPay** hosted checkout, return / cancel / error flows.
- Orders record `coupon_code`, `discount_amount`, `sender_number`, `transaction_id`, `payment_ref`, and status transitions (`PENDING → PAID | FAILED | CANCELLED | REFUNDED`).
- On successful payment: automatic enrollment.

### Admin CMS (`/admin`)
- **Overview** with KPIs (total students, courses, revenue, pending orders) and today's workflow queue.
- **Categories** — hierarchical create/rename/delete.
- **Courses** — full CRUD with subtitle, intro video, total duration, description, "what you'll learn" list, gift resources, thumbnail, price/discount, level, publish toggle.
- **Course editor** (`/admin/courses/:id/edit`) — module & lesson tree, per-lesson video URL, duration, description, assignment, resource link.
- **Orders** — three tabs (All / Incomplete / Paid), status editing, one-click email/phone contact, CSV export.
- **Coupons** — create/toggle/delete, percent or fixed, date-bounded, `max_uses` cap.
- **Reviews** — moderation queue.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) v1 (SSR + server functions) |
| UI | React 19, [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/) (Radix primitives), [lucide-react](https://lucide.dev/) icons, [motion](https://motion.dev/) |
| Data | [TanStack Query](https://tanstack.com/query) v5, [TanStack Router](https://tanstack.com/router) v1 file-based routing |
| Forms | [react-hook-form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| Backend | Supabase (Postgres + Auth + Storage + RLS) |
| Payments | UddoktaPay hosted checkout |
| Build / Runtime | Vite 7, edge-compatible (Cloudflare Workers target) |
| Language | Bengali (`lang="bn"`) — Hind Siliguri / Noto Serif Bengali |
| Testing | Playwright (Python) |

---

## Project Structure

```
src/
├── routes/                          # File-based routing (TanStack)
│   ├── __root.tsx                   # Root shell: <html>/<head>/<body>, header, auth listener
│   ├── index.tsx                    # Landing page
│   ├── auth.tsx                     # Sign in / sign up
│   ├── courses.tsx                  # /courses layout
│   ├── courses.index.tsx            # Course catalog
│   ├── courses.$slug.tsx            # Public course detail
│   ├── free-class.tsx               # Free demo class
│   ├── checkout.return.tsx          # UddoktaPay success
│   ├── checkout.cancelled.tsx
│   ├── checkout.error.tsx
│   ├── api/                         # HTTP endpoints (webhooks, public APIs)
│   └── _authenticated/              # Gated subtree (ssr: false, auth-guarded)
│       ├── route.tsx                # Auth gate — do not edit
│       ├── dashboard.*.tsx          # Student surfaces
│       ├── checkout.$courseId.tsx   # Checkout form
│       └── admin.*.tsx              # Admin CMS
├── lib/                             # Server functions (*.functions.ts)
│   ├── admin.functions.ts           # Admin CRUD (categories, courses, modules, lessons, orders)
│   ├── lms-admin.functions.ts       # Coupons, previews
│   ├── courses.functions.ts         # Public course reads
│   ├── learning.functions.ts        # Course player, progress
│   ├── payments.functions.ts        # UddoktaPay charge creation
│   └── format.ts                    # BDT formatting, etc.
├── integrations/supabase/           # Auto-generated — do not edit
│   ├── client.ts                    # Browser client
│   ├── client.server.ts             # Admin (service-role) client — server-only
│   ├── auth-middleware.ts           # requireSupabaseAuth
│   ├── auth-attacher.ts             # Bearer token client middleware
│   └── types.ts                     # Generated DB types
├── components/                      # Reusable UI (shadcn/ui + app components)
├── hooks/
└── styles.css                       # Tailwind v4 tokens & theme

supabase/migrations/                 # Ordered SQL migrations
tests/e2e/                           # Playwright test suite (see below)
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20 and **Bun** (or npm/pnpm)
- A Supabase project (or use Lovable Cloud, which manages one for you)

### Install

```bash
bun install       # or: npm install
```

### Run the dev server

```bash
bun run dev       # http://localhost:8080
```

### Build

```bash
bun run build     # production build (edge-compatible)
bun run preview   # preview the build locally
```

---

## Environment Variables

Client-visible (safe to expose):

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key |
| `VITE_SUPABASE_PROJECT_ID` | Project ref |

Server-only (never expose):

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Same as above, for server functions |
| `SUPABASE_PUBLISHABLE_KEY` | Server-side publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key — bypasses RLS |
| `UDDOKTAPAY_API_KEY` | UddoktaPay merchant key |
| `UDDOKTAPAY_BASE_URL` | UddoktaPay endpoint (sandbox vs production) |
| `LOVABLE_API_KEY` | Lovable AI Gateway key (optional) |

On Lovable Cloud these are provisioned automatically. For self-hosting, set them in your hosting environment.

---

## Database

Schema is managed via **ordered SQL migrations** in `supabase/migrations/`. Core tables:

| Table | Purpose |
|---|---|
| `profiles` | Per-user profile (mirrored from `auth.users` via trigger) |
| `user_roles` | Separate table with `app_role` enum (`STUDENT`, `ADMIN`) — checked via `has_role()` SECURITY DEFINER function to avoid RLS recursion |
| `categories` | Hierarchical course categories |
| `courses` | Published catalog with pricing, metadata, `what_you_learn[]`, `gift_resources`, `intro_video_url` |
| `modules` | Ordered chapters within a course |
| `lessons` | Video lessons with `duration_sec`, `description`, `assignment`, `resource_url` |
| `enrollments` | Course access records — created on paid order |
| `lesson_progress` | Per-student per-lesson completion |
| `orders` | UddoktaPay orders — `coupon_code`, `discount_amount`, `sender_number`, `transaction_id`, `payment_ref`, status |
| `coupons` | Percent or fixed discounts, active flag, date window, `max_uses` |
| `reviews` | Course reviews with moderation |
| `support_threads`, `support_replies` | Student peer forum |

Every user-data table has RLS enabled with policies scoped to `auth.uid()`. Admin queries use the service-role client from inside server functions and always verify admin role via `has_role()` first.

---

## Server Functions

App-internal server logic lives in `src/lib/*.functions.ts` as **TanStack `createServerFn`** RPCs — not Supabase Edge Functions.

Two authorization patterns:

```ts
// Authenticated (bearer token attached automatically)
export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return context.supabase.from("orders").select("*").eq("user_id", context.userId);
  });

// Admin-only (verify role before touching service-role client)
export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // ...
  });
```

Raw HTTP endpoints (webhooks, public APIs) live under `src/routes/api/` as file-based server routes.

---

## Payments

Checkout flow:

1. Student opens `/checkout/:courseId`, optionally applies a coupon (previewed against server-side rules).
2. `createCourseCharge` server function re-validates the coupon, inserts a `PENDING` order, and calls UddoktaPay to create a hosted checkout session.
3. User is redirected to UddoktaPay.
4. On completion, UddoktaPay redirects to `/checkout/return` → status verified → order marked `PAID` → enrollment created.
5. Cancelled or failed payments land on `/checkout/cancelled` or `/checkout/error`.

---

## Authentication & Roles

- Sign-in via Supabase Auth (email + Google OAuth through the Lovable broker).
- Session persisted in `localStorage`; automatically attached to every server function call via `attachSupabaseAuth` middleware in `src/start.ts`.
- All authenticated routes live under `src/routes/_authenticated/`, gated by an integration-managed layout (`ssr: false`) that redirects unauthenticated users to `/auth`.
- Admin access is gated by the `ADMIN` role in `user_roles`. Every admin server function calls `assertAdmin(context)` before running privileged queries.

---

## Testing

A comprehensive Playwright (Python) test suite lives in `tests/e2e/`. It exercises **every major surface** — landing, catalog, detail, checkout error, dashboard, support, and the full admin CMS (overview cards + CSV export, orders join + tab switching, category/coupon/instructor **create** mutations verified against the DB, courses list + editor, reviews page, users search + role filter).

```bash
python -m pip install --no-cache-dir playwright
python -m playwright install chromium

python tests/e2e/run.py                 # run everything
python tests/e2e/run.py --only admin    # substring filter
python tests/e2e/run.py --headed        # see the browser
python tests/e2e/run.py --no-allure     # skip Allure result emission
```

Auth: set `E2E_EMAIL` / `E2E_PASSWORD` for an admin account (the runner signs in through `/auth`), or rely on the sandbox's `LOVABLE_BROWSER_SUPABASE_*` session vars when running inside Lovable. Screenshots for every step land in `tests/e2e/screenshots/`. See [`tests/e2e/README.md`](./tests/e2e/README.md) for the full docs.

### Reports

Every run writes Allure v2 results (JSON + screenshot attachments) to `tests/e2e/allure-results/`, and a portable PDF summary to `/mnt/documents/e2e-test-report.pdf`.

```bash
# Interactive Allure HTML report (opens a local browser)
nix run nixpkgs#allure -- serve tests/e2e/allure-results

# Or generate static HTML into tests/e2e/allure-report/
nix run nixpkgs#allure -- generate tests/e2e/allure-results -o tests/e2e/allure-report --clean

# Rebuild the PDF summary from the last run
python tests/e2e/build_pdf_report.py
```

The PDF ([`e2e-test-report.pdf`](/mnt/documents/e2e-test-report.pdf)) contains the run summary, environment snapshot, and per-suite pass/fail table with durations — suitable for attaching to a PR or a stakeholder update. Regenerate it any time after a run without re-executing the suite.

#### Allure report preview

Static snapshots of the generated Allure HTML report (from `tests/e2e/allure-report-screenshots/`):

| Overview | Suites | Graphs |
| --- | --- | --- |
| ![Allure overview](tests/e2e/allure-report-screenshots/overview.png) | ![Allure suites](tests/e2e/allure-report-screenshots/suites.png) | ![Allure graphs](tests/e2e/allure-report-screenshots/graphs.png) |

| Timeline | Behaviors | Packages | Categories |
| --- | --- | --- | --- |
| ![Allure timeline](tests/e2e/allure-report-screenshots/timeline.png) | ![Allure behaviors](tests/e2e/allure-report-screenshots/behaviors.png) | ![Allure packages](tests/e2e/allure-report-screenshots/packages.png) | ![Allure categories](tests/e2e/allure-report-screenshots/categories.png) |



---

## Deployment

The app targets **edge runtimes** (Cloudflare Workers via `nodejs_compat`). On Lovable:

- Click **Publish** in the editor — the app is served from `<project>.lovable.app`.
- Custom domains can be configured in Project Settings.

For self-hosting: run `bun run build` and deploy the `.output/` bundle to any Workers-compatible platform. Ensure the [env vars](#environment-variables) are configured server-side.

---

## Contributing

1. Fork / clone via the GitHub integration (Plus menu → GitHub → Connect project in Lovable).
2. Create a branch, edit locally, push — changes sync back to Lovable in real time.
3. Add / update migrations under `supabase/migrations/` — never edit an existing migration file.
4. Run the E2E suite before opening a PR:
   ```bash
   python tests/e2e/run.py
   ```
5. Follow the repo conventions:
   - Server-only imports live in `*.server.ts` or are dynamically imported inside `.handler()`.
   - Every `public.*` table needs `GRANT` + `ENABLE RLS` + policies in the same migration.
   - Never edit `src/integrations/supabase/*` or `src/routeTree.gen.ts` — they're auto-generated.

---

## License

Private project. All rights reserved.
