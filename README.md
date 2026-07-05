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

```text
┌────────────────────┐   HTTPS    ┌──────────────────────────────┐
│   Browser (React)  │ ─────────► │  Edge Worker (TanStack SSR)  │
│  TanStack Router   │            │  ─ Route handlers            │
│  TanStack Query    │  RPC       │  ─ createServerFn endpoints  │
└─────────┬──────────┘            │  ─ Webhook / public API      │
          │                       └──────────────┬───────────────┘
          │ Bearer token                         │ RLS (user JWT)
          │                                      │ or service role
          ▼                                      ▼
┌────────────────────┐            ┌──────────────────────────────┐
│    Auth (JWT)      │            │        PostgreSQL            │
│  email + Google    │            │  RLS policies + SECURITY     │
│  session storage   │            │  DEFINER role helpers        │
└────────────────────┘            └──────────────┬───────────────┘
                                                 │
                                                 ▼
                                       ┌──────────────────┐
                                       │   UddoktaPay     │
                                       │  hosted checkout │
                                       └──────────────────┘
```

- **SSR-first**: initial HTML is rendered on the edge for SEO and time-to-content; TanStack Query hydrates on the client.
- **Typed RPC**: client → server calls go through `createServerFn` with Zod input validators — no hand-rolled `fetch('/api/...')`.
- **Two Postgres clients**: an anon-key client that enforces RLS as the signed-in user, and a service-role client used only inside role-checked admin server functions.
- **Auth-gated subtree**: everything under `_authenticated/` is behind a route-level layout guard; the admin CMS additionally re-checks role server-side on every mutation.

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
