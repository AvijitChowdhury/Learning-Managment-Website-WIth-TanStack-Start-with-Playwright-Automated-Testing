# শিখো — Bengali Learning Management System

A production-grade, full-stack Learning Management System for the Bengali-speaking market. Built with **TanStack Start (SSR)**, **React 19**, **PostgreSQL** (via Supabase), and **Tailwind CSS v4**. Ships with student learning surfaces, an admin CMS, coupon-aware checkout via **UddoktaPay**, and a peer support forum — end to end in Bengali.

Live: [lmsavi.lovable.app](https://lmsavi.lovable.app)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
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
- [License](#license)

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
- Automatic enrollment on successful payment.

### Admin CMS (`/admin`)
- **Overview** with KPIs (total students, courses, revenue, pending orders) and today's workflow queue.
- **Categories** — hierarchical create / rename / delete.
- **Courses** — full CRUD with subtitle, intro video, total duration, description, "what you'll learn" list, gift resources, thumbnail, price / discount, level, publish toggle.
- **Course editor** (`/admin/courses/:id/edit`) — module & lesson tree, per-lesson video URL, duration, description, assignment, resource link.
- **Orders** — three tabs (All / Incomplete / Paid), status editing, one-click email / phone contact, CSV export.
- **Coupons** — create / toggle / delete, percent or fixed, date-bounded, `max_uses` cap.
- **Reviews** — moderation queue.
- **Instructors & Users** — profile management, admin role search & filter.

---

## Screenshots

All screenshots below are captured by the automated E2E suite (`tests/e2e/run.py`) — each one is proof the corresponding feature is exercised and passing on every run.

### Public site

| Landing | Course catalog | Course detail |
| --- | --- | --- |
| ![Landing page](tests/e2e/screenshots/01_landing.png) | ![Courses list](tests/e2e/screenshots/02_courses_list.png) | ![Course detail](tests/e2e/screenshots/03_course_detail.png) |

| Free demo class | Checkout — cancelled | Checkout — error |
| --- | --- | --- |
| ![Free class](tests/e2e/screenshots/04_free_class.png) | ![Checkout cancelled](tests/e2e/screenshots/32_checkout_cancelled.png) | ![Checkout error](tests/e2e/screenshots/05_checkout_error.png) |

| `sitemap.xml` | 404 page | Auth redirect |
| --- | --- | --- |
| ![Sitemap](tests/e2e/screenshots/30_sitemap.png) | ![404](tests/e2e/screenshots/31_not_found.png) | ![Auth redirect](tests/e2e/screenshots/33_auth_redirect.png) |

### Student dashboard

| Dashboard | Profile | My orders | Support forum |
| --- | --- | --- | --- |
| ![Dashboard](tests/e2e/screenshots/06_dashboard.png) | ![Profile](tests/e2e/screenshots/34_profile.png) | ![Orders](tests/e2e/screenshots/35_orders.png) | ![Support](tests/e2e/screenshots/07_support.png) |

### Admin CMS

| Overview | KPI cards | Categories |
| --- | --- | --- |
| ![Admin overview](tests/e2e/screenshots/10_admin_overview.png) | ![Overview cards](tests/e2e/screenshots/17_admin_overview_cards.png) | ![Categories](tests/e2e/screenshots/13_admin_categories.png) |

| Courses list | Course editor | Coupons |
| --- | --- | --- |
| ![Courses](tests/e2e/screenshots/15_admin_courses.png) | ![Course editor](tests/e2e/screenshots/16_admin_course_editor.png) | ![Coupons](tests/e2e/screenshots/14_admin_coupons.png) |

| Orders — all | Orders — paid | Reviews |
| --- | --- | --- |
| ![Orders](tests/e2e/screenshots/11_admin_orders.png) | ![Orders paid](tests/e2e/screenshots/12_admin_orders_paid.png) | ![Reviews](tests/e2e/screenshots/20_admin_reviews.png) |

| Instructors | Instructor created | Users |
| --- | --- | --- |
| ![Instructors](tests/e2e/screenshots/18_admin_instructors.png) | ![Instructor created](tests/e2e/screenshots/19_admin_instructor_created.png) | ![Users](tests/e2e/screenshots/21_admin_users.png) |

### Responsive

| Mobile (390px) | Tablet (820px) | Desktop (1440px) |
| --- | --- | --- |
| ![Mobile landing](tests/e2e/screenshots/36_mobile_landing.png) | ![Tablet courses](tests/e2e/screenshots/37_tablet_courses.png) | ![Desktop landing](tests/e2e/screenshots/38_desktop_landing.png) |

---

## Feature verification

Every feature below has a matching Playwright test in `tests/e2e/tests/` and a screenshot above. The full suite ships **54 tests / 54 passing** on the last recorded run — see `tests/e2e/allure-report/` for the interactive report and [`/mnt/documents/e2e-test-report.pdf`](/mnt/documents/e2e-test-report.pdf) for the PDF summary.

| Area | Feature | Verified by | Evidence |
| --- | --- | --- | --- |
| Public | Landing page renders, primary CTAs present | `test_public.landing` | `01_landing.png` |
| Public | Course catalog lists published courses | `test_public.courses_list` | `02_courses_list.png` |
| Public | Course detail (hero, curriculum, reviews) | `test_public.course_detail` | `03_course_detail.png` |
| Public | Free demo class lead capture | `test_public.free_class` | `04_free_class.png` |
| Public | Checkout error / cancelled screens | `test_public.checkout_error`, `test_navigation.checkout_cancelled` | `05_checkout_error.png`, `32_checkout_cancelled.png` |
| SEO | `sitemap.xml`, `robots.txt`, meta / OG / canonical, `noindex` on gated routes | `test_seo.*` | `30_sitemap.png` |
| Navigation | 404 handling, browser back/forward, auth redirect | `test_navigation.*`, `test_auth_flow.*` | `31_not_found.png`, `33_auth_redirect.png` |
| Student | Dashboard — enrolled courses & recent orders | `test_dashboard.dashboard` | `06_dashboard.png` |
| Student | Profile page | `test_auth_flow.profile` | `34_profile.png` |
| Student | My orders list | `test_auth_flow.orders` | `35_orders.png` |
| Student | Support forum threads | `test_dashboard.support` | `07_support.png` |
| Admin | Overview KPIs + workflow queue | `test_admin.overview`, `test_admin.overview_cards` | `10_admin_overview.png`, `17_admin_overview_cards.png` |
| Admin | Categories — create / rename / delete | `test_admin.categories` | `13_admin_categories.png` |
| Admin | Courses list + full CRUD | `test_admin.courses` | `15_admin_courses.png` |
| Admin | Course editor (modules + lessons) | `test_admin.course_editor` | `16_admin_course_editor.png` |
| Admin | Coupons — create / toggle / delete, date + usage limits | `test_admin.coupons` | `14_admin_coupons.png` |
| Admin | Orders — All / Incomplete / Paid tabs, CSV export | `test_admin.orders`, `test_admin.orders_paid` | `11_admin_orders.png`, `12_admin_orders_paid.png` |
| Admin | Reviews moderation | `test_admin.reviews` | `20_admin_reviews.png` |
| Admin | Instructors create + list | `test_admin.instructors`, `test_admin.instructor_created` | `18_admin_instructors.png`, `19_admin_instructor_created.png` |
| Admin | Users search + role filter | `test_admin.users` | `21_admin_users.png` |
| Quality | Accessibility (alt text, button names, `html[lang]`, focus order) | `test_a11y.*` | Allure |
| Quality | Performance budgets, no 5xx, console hygiene, DOM budget | `test_performance.*` | Allure |
| i18n | Bengali content + `৳` currency across pages | `test_i18n.*` | Allure |
| Responsive | Mobile / tablet / desktop overflow audit | `test_responsive.*` | `36–38_*.png` |

---


## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) v1 (SSR + typed server functions) |
| UI | React 19, [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/) (Radix primitives), [lucide-react](https://lucide.dev/) icons, [motion](https://motion.dev/) |
| Data | [TanStack Query](https://tanstack.com/query) v5, [TanStack Router](https://tanstack.com/router) v1 file-based routing |
| Forms | [react-hook-form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| Backend | PostgreSQL, Auth, Storage, Row-Level Security (Supabase) |
| Payments | UddoktaPay hosted checkout |
| Build | Vite 7, edge-compatible bundle (Cloudflare Workers target) |
| Language | Bengali (`lang="bn"`) — Hind Siliguri / Noto Serif Bengali |
| Testing | Playwright (Python) with Allure + PDF reporting |

---

## Architecture

### System diagram

```mermaid
flowchart TB
    subgraph Client["Browser (React 19 SPA + SSR hydrate)"]
        UI[TanStack Router<br/>UI components<br/>shadcn/ui + Tailwind v4]
        Query[TanStack Query<br/>cache + suspense]
        SBClient[Supabase JS client<br/>publishable key + user JWT]
    end

    subgraph Edge["Cloudflare Worker (TanStack Start SSR)"]
        Root[__root.tsx<br/>SSR shell + head]
        Routes[File-based routes<br/>src/routes/**]
        Guard[_authenticated gate<br/>redirect to /auth]
        ServerFn[createServerFn<br/>typed RPC + Zod]
        API[/api/public/*<br/>webhooks + public APIs/]
        Mw[requireSupabaseAuth<br/>bearer middleware]
    end

    subgraph Data["Managed Postgres + Auth + Storage"]
        Auth[Auth<br/>email + Google OAuth]
        DB[(PostgreSQL<br/>RLS policies<br/>SECURITY DEFINER helpers)]
        Buckets[(Storage buckets<br/>course-videos<br/>course-thumbnails)]
    end

    subgraph External["External services"]
        Uddokta[UddoktaPay<br/>hosted checkout]
    end

    UI --> Query
    Query -->|useServerFn| ServerFn
    UI -->|Link / navigate| Routes
    SBClient -->|sign-in / session| Auth
    SBClient -->|realtime + reads| DB

    Root --> Routes
    Routes --> Guard
    Guard --> ServerFn
    ServerFn --> Mw
    Mw -->|verify JWT| Auth
    ServerFn -->|RLS as user| DB
    ServerFn -->|signed URLs| Buckets
    ServerFn -->|createCharge| Uddokta

    Uddokta -->|webhook| API
    API -->|service role<br/>verified payload| DB
```

Source: [`docs/system-architecture.mmd`](./docs/system-architecture.mmd)

### Principles

- **SSR-first**: initial HTML is rendered on the edge for SEO and time-to-content; TanStack Query hydrates on the client.
- **Typed RPC**: client → server calls go through `createServerFn` with Zod input validators — no hand-rolled `fetch('/api/...')`.
- **Two Postgres clients**: an anon-key client that enforces RLS as the signed-in user, and a service-role client used only inside role-checked admin server functions and verified webhooks.
- **Auth-gated subtree**: everything under `_authenticated/` is behind a route-level layout guard; the admin CMS additionally re-checks role server-side on every mutation via `has_role(auth.uid(), 'ADMIN')`.
- **Public API prefix**: webhooks and third-party callbacks live under `/api/public/*` and verify signatures/secrets in the handler.


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
│   └── _authenticated/              # Gated subtree (auth-guarded layout)
│       ├── route.tsx                # Auth gate
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
├── integrations/supabase/           # Generated DB clients & types
│   ├── client.ts                    # Browser client (anon key, RLS)
│   ├── client.server.ts             # Admin (service-role) client — server-only
│   ├── auth-middleware.ts           # requireSupabaseAuth server middleware
│   ├── auth-attacher.ts             # Bearer token client middleware
│   └── types.ts                     # Generated DB types
├── components/                      # Reusable UI (shadcn/ui + app components)
├── hooks/
└── styles.css                       # Tailwind v4 tokens & theme

supabase/migrations/                 # Ordered SQL migrations
tests/e2e/                           # Playwright test suite (see Testing)
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20 and **Bun** (recommended) — npm / pnpm also work.
- A **PostgreSQL** database with Supabase-compatible Auth (self-hosted Supabase or hosted).
- An **UddoktaPay** merchant account for payments (a sandbox key is enough for local development).

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

### Apply database migrations

```bash
supabase db push  # applies ordered migrations under supabase/migrations/
```

---

## Environment Variables

Copy `.env.example` to `.env` (or configure equivalents in your hosting dashboard).

Client-visible (safe to expose):

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Postgres/Auth project URL |
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

---

## Database

Schema is managed via **ordered SQL migrations** in `supabase/migrations/`. Core tables:

| Table | Purpose |
|---|---|
| `profiles` | Per-user profile (mirrored from `auth.users` via trigger) |
| `user_roles` | Separate table with `app_role` enum (`STUDENT`, `ADMIN`) — checked via a `has_role()` SECURITY DEFINER function to avoid RLS recursion |
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

Every user-data table has RLS enabled with policies scoped to `auth.uid()`. Admin queries use the service-role client from inside server functions and always verify the admin role via `has_role()` first.

---

## Server Functions

App-internal server logic lives in `src/lib/*.functions.ts` as **TanStack `createServerFn`** RPCs. Two authorization patterns:

```ts
// Authenticated (bearer token attached automatically, RLS as the signed-in user)
export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return context.supabase.from("orders").select("*").eq("user_id", context.userId);
  });

// Admin-only (verify role before touching the service-role client)
export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // ...
  });
```

Raw HTTP endpoints (webhooks, public APIs) live under `src/routes/api/` as file-based server routes. Public endpoints under `src/routes/api/public/*` verify caller signatures/secrets inside the handler.

---

## Payments

Checkout flow:

1. Student opens `/checkout/:courseId` and optionally applies a coupon (previewed against server-side rules).
2. `createCourseCharge` server function re-validates the coupon, inserts a `PENDING` order, and calls UddoktaPay to create a hosted checkout session.
3. User is redirected to the UddoktaPay hosted page.
4. On completion, UddoktaPay redirects to `/checkout/return` → status verified server-side → order marked `PAID` → enrollment created.
5. Cancelled or failed payments land on `/checkout/cancelled` or `/checkout/error`.

Coupons are re-checked on the server at charge time — client previews are never trusted.

---

## Authentication & Roles

- Sign-in via email + password and Google OAuth.
- Session persisted in `localStorage` and attached to every server function call via `attachSupabaseAuth` middleware in `src/start.ts`.
- All authenticated routes live under `src/routes/_authenticated/`, gated by a layout that redirects unauthenticated users to `/auth`.
- Admin access is gated by the `ADMIN` role in `user_roles`. Every admin server function calls `assertAdmin(context)` before running privileged queries — the client-side check is only a UX hint.

---

## Testing

A comprehensive **Playwright (Python)** test suite lives in `tests/e2e/`. It exercises every major surface — landing, catalog, detail, checkout error, dashboard, support, and the full admin CMS (overview cards + CSV export, orders join + tab switching, category / coupon / instructor **create** mutations verified against the DB, courses list + editor, reviews page, users search + role filter).

```bash
python -m pip install --no-cache-dir playwright
python -m playwright install chromium

python tests/e2e/run.py                 # run everything
python tests/e2e/run.py --only admin    # substring filter
python tests/e2e/run.py --headed        # see the browser
python tests/e2e/run.py --no-allure     # skip Allure result emission
```

**Auth:** set `E2E_EMAIL` / `E2E_PASSWORD` for an admin account — the runner signs in through `/auth` and reuses the session across tests. Screenshots for every step land in `tests/e2e/screenshots/`. See [`tests/e2e/README.md`](./tests/e2e/README.md) for the full docs.

### Reports

Every run writes **Allure v2 results** (JSON + screenshot attachments) to `tests/e2e/allure-results/`, and a portable **PDF summary** to `/mnt/documents/e2e-test-report.pdf`.

```bash
# Interactive Allure HTML report (opens a local browser)
allure serve tests/e2e/allure-results

# Or generate static HTML into tests/e2e/allure-report/
allure generate tests/e2e/allure-results -o tests/e2e/allure-report --clean

# Rebuild the PDF summary from the last run (no re-execution)
python tests/e2e/build_pdf_report.py
```

The PDF ([`e2e-test-report.pdf`](/mnt/documents/e2e-test-report.pdf)) contains the run summary, environment snapshot, and per-suite pass / fail table with durations — suitable for attaching to a PR or a stakeholder update.

#### Allure report preview

| Overview | Suites | Graphs |
| --- | --- | --- |
| ![Allure overview](tests/e2e/allure-report-screenshots/overview.png) | ![Allure suites](tests/e2e/allure-report-screenshots/suites.png) | ![Allure graphs](tests/e2e/allure-report-screenshots/graphs.png) |

| Timeline | Behaviors | Packages | Categories |
| --- | --- | --- | --- |
| ![Allure timeline](tests/e2e/allure-report-screenshots/timeline.png) | ![Allure behaviors](tests/e2e/allure-report-screenshots/behaviors.png) | ![Allure packages](tests/e2e/allure-report-screenshots/packages.png) | ![Allure categories](tests/e2e/allure-report-screenshots/categories.png) |

---

## Deployment

The app targets **edge runtimes** (Cloudflare Workers via `nodejs_compat`), but the build output is portable to any Workers-compatible platform.

1. `bun run build` — produces an edge-compatible bundle under `.output/`.
2. Deploy `.output/` to Cloudflare Workers (`wrangler deploy`) or an equivalent edge platform.
3. Configure the [environment variables](#environment-variables) server-side.
4. Run `supabase db push` against your production database to apply migrations.

For a Node.js host, use `bun run start` to serve the built bundle.

---

## Contributing

1. Fork and clone the repository.
2. Create a feature branch off `main`.
3. Add or update migrations under `supabase/migrations/` — **never edit an existing migration file**; add a new one.
4. Run the E2E suite before opening a PR:
   ```bash
   python tests/e2e/run.py
   ```
5. Follow the repo conventions:
   - Server-only imports live in `*.server.ts` or are dynamically imported inside `.handler()`.
   - Every `public.*` table needs `GRANT` + `ENABLE RLS` + policies in the same migration.
   - Generated files (`src/integrations/supabase/*`, `src/routeTree.gen.ts`) are not hand-edited.
   - Prefer typed server functions over raw `fetch` calls from the client.

---

## License

Proprietary. All rights reserved.
