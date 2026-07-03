# Bengali LMS — Build Plan

A phased build for a Bengali-first LMS (BDT, UddoktaPay) using TanStack Start + Lovable Cloud (Postgres, Auth, Storage). Prisma schema is translated to SQL migrations; RLS enforces access rules.

---

## Stack decisions

- **Framework:** TanStack Start (this template) instead of Next.js from the PRD — same SSR/SEO capabilities, native to Lovable.
- **Backend:** Lovable Cloud (Postgres + Auth + Storage). NodeJS or Python with prisma ORM.
- **Payments:** UddoktaPay via a TanStack server route (`/api/public/webhooks/uddoktapay`) + a `createServerFn` to create charges and verify.
- **Video:** Supabase Storage with signed URLs (v1). Mux/Bunny can slot in later.
- **i18n:** Bengali-first copy in `src/lib/i18n/bn.ts`. `Noto Sans Bengali` + `Hind Siliguri` via `<link>` in `__root.tsx`. `Intl.NumberFormat('bn-BD', { style:'currency', currency:'BDT' })`.
- **Roles:** `app_role` enum + `user_roles` table + `has_role()` security-definer function (never store role on profile).

---

## Phase 1 — Foundation

1. Enable Lovable Cloud.
2. Design system in `src/styles.css` — warm/clean Bengali edu palette, Bangla display + body fonts, custom `Button`/`Card` variants.
3. Root layout: header (logo, কোর্স, ড্যাশবোর্ড, লগইন), footer, Bengali meta.
4. Migrations (single batch, with GRANTs + RLS):
  - Enums: `course_level`, `lesson_type`, `order_status`, `app_role`.
  - Tables: `profiles`, `user_roles`, `categories`, `courses`, `modules`, `lessons`, `enrollments`, `lesson_progress`, `orders`, `reviews`.
  - `handle_new_user()` trigger on `auth.users` → inserts profile + default `STUDENT` role.
  - `has_role(uuid, app_role)` security-definer.
  - RLS policies per PRD §6 (students read own orders/enrollments/progress; anyone reads published courses; only admins write course content; reviews only by enrolled buyers).
  - Storage buckets: `course-thumbnails` (public), `course-videos` (private, signed).
5. Auth pages `/auth` (Bengali signup/login/reset) — email/password only in v1.
6. Seed one admin via SQL migration granting `ADMIN` role to a specified email.

## Phase 2 — Public site (SEO/SSR)

Routes: `/`, `/courses`, `/courses/$slug`. Each with per-page `head()` (title, description, og, canonical). Loader-driven data via public server fn using publishable key + narrow `TO anon` SELECT policies on published courses/modules/lessons (preview-only)/reviews.

- `/` — hero, featured courses, categories, trust bar.
- `/courses` — category filter, search (Postgres `ilike` + `pg_trgm`), rating sort.
- `/courses/$slug` — hero, curriculum (free-preview lessons playable), instructor, reviews, sticky "কিনুন ৳" CTA.

## Phase 3 — Commerce (UddoktaPay)

- `/checkout/$courseId` (under `_authenticated/`) — server fn creates `PENDING` order (server-computed price), calls UddoktaPay `checkout-v2`, returns `payment_url`, client redirects.
- Return route `/checkout/return` and `/checkout/cancelled` — re-verify via `verify-payment`, show live status.
- Webhook `src/routes/api/public/webhooks/uddoktapay.ts` — verify `RT-UDDOKTAPAY-API-KEY` header, re-call `verify-payment`, idempotent by `invoice_id` (unique constraint on `orders.payment_ref`), on `COMPLETED` set `PAID` + create `enrollment`.
- Secrets: `UDDOKTAPAY_API_KEY`, `UDDOKTAPAY_BASE_URL`, `UDDOKTAPAY_WEBHOOK_SECRET`.

## Phase 4 — Learning experience

Under `src/routes/_authenticated/`:

- `/dashboard` — my courses grid + progress bars.
- `/dashboard/courses/$id` — course player: sidebar curriculum, video/text/attachment renderer, "সম্পন্ন" button → upserts `lesson_progress`, recomputes `enrollments.progress_pct` via trigger.
- `/dashboard/orders` — order history + downloadable receipt.
- `/dashboard/profile` — name/avatar/password.
- Signed-URL server fn gates protected video access to enrolled users only.

## Phase 5 — Admin + trust

Under `/_authenticated/admin/` gated by `has_role(uid,'ADMIN')`:

- `/admin` — revenue, orders, students, top courses (SQL views).
- `/admin/orders` — filter/search, mark refunded/cancelled, view gateway details.
- `/admin/courses` — CRUD + publish toggle.
- `/admin/courses/$id/edit` — module/lesson editor (drag-reorder, free-preview toggle, thumbnail + video upload to Storage).
- `/admin/reviews` — hide/unhide.
- Reviews on course detail + submit form (enrolled users, one per course).

---

## Technical notes

- Every route with a loader defines `errorComponent` + `notFoundComponent`; root has `defaultErrorComponent`.
- Public loaders use the server publishable client; authed reads via `requireSupabaseAuth`; only webhooks/admin ops use `supabaseAdmin`.
- `functionMiddleware` in `src/start.ts` attaches the Supabase bearer.
- Sitemap + robots.txt with all public + `/courses/$slug` entries generated from DB.
- Currency & dates via `Intl` helpers in `src/lib/format.ts`.

## Deliverables per phase

Each phase ends with a working, deployable slice. I'll pause after Phase 1 for review before proceeding, unless you tell me to run straight through.

## Open questions from the PRD (§11) — please confirm

1. Single-instructor (you) or multi-instructor from day one? Ans: Single
2. Drip content or full access on purchase? Ans: yes
3. Sandbox UddoktaPay key ready, or start with mock and wire real keys later? Ans: ok
4. Video hosting for v1 — Supabase Storage (simple) or Mux/Bunny (better streaming). ?Ans: ok