# LMS Wireframe Implementation Plan

Below is a gap analysis of your wireframe vs. what already exists, followed by grouped work to complete it.

## What already exists

- **Landing page** (`src/routes/index.tsx`) with hero + CTAs
- **Course catalog** (`courses.index.tsx`) and **detail page** (`courses.$slug.tsx`) with curriculum / reviews / FAQ / registration cards
- **Checkout** (`_authenticated/checkout.$courseId.tsx`) + `checkout.return.tsx` / `checkout.cancelled.tsx`
- **Student dashboard**: `dashboard.index.tsx`, `dashboard.courses.$id.tsx` (module/lesson viewer with search/filters/tabs), `dashboard.orders.tsx`, `dashboard.profile.tsx`
- **Admin**: `admin.index.tsx` (overview), `admin.courses.tsx`, `admin.courses.$id.edit.tsx`, `admin.orders.tsx`, `admin.reviews.tsx`
- **DB tables**: categories, courses, modules, lessons, enrollments, lesson_progress, orders, reviews, profiles, user_roles

## Gaps to close

### 1. Landing page CTAs → correct destinations
Wire the three hero CTAs on `index.tsx`:
- **Checkout CTA** → `/courses` (or featured course → `/checkout/$courseId`)
- **Course Module CTA** → `/courses` catalog
- **Free Class CTA** → new `/free-class` route showing a free demo lesson

### 2. Free Demo Class section (missing)
- New route `src/routes/free-class.tsx` with an embedded YouTube demo, benefits copy, and a "Start free" CTA
- Add `is_free_demo` boolean on `lessons` OR pick a designated demo lesson id in site config

### 3. Incomplete Order tracking (partial)
Orders table exists but wireframe wants "abandoning payment = incomplete order":
- Ensure `orders` row is created on checkout submit with `status = 'pending'` BEFORE redirecting to UddoktaPay
- Rows stay `pending` if user never returns; success webhook flips to `paid`
- Admin "Incomplete Orders" view filters `status = 'pending'` and shows name / phone (tel:) / email (mailto:)

### 4. Payment Error page (missing)
- New route `src/routes/checkout.error.tsx` with error message, retry button, and support link
- UddoktaPay failure webhook / return handler routes here

### 5. Support Forum (missing)
- New route `src/routes/_authenticated/dashboard.support.tsx`
- Minimal Q&A: `support_threads` + `support_replies` tables with RLS (students see own threads; admins see all)
- Sidebar link in student dashboard

### 6. Downloadable resources (partial)
- `lessons` has fields; ensure `resource_url` renders as a download button in `dashboard.courses.$id.tsx` curriculum
- Course-level "Gift Resources" from `courses.gift_resources` shown on dashboard course header

### 7. Admin Overview metrics (verify/extend)
Confirm `admin.index.tsx` shows all six KPIs from wireframe:
- Total enrolments, Total sale amount, Today's enrolments, Today's sale, Today's incomplete orders
- Date-range filter + **Export CSV** button (server fn returning CSV of filtered orders/enrolments)

### 8. Categories management (missing UI)
- New route `src/routes/_authenticated/admin.categories.tsx`
- CRUD list + add/delete + sub-category support (add `parent_id uuid references categories(id)` via migration)

### 9. Add-a-Course form structure (verify tabs)
`admin.courses.$id.edit.tsx` must present two tabs matching wireframe:
- **Tab 1 – Basic Info**: name, description, difficulty, categories (create-or-select), price, intro video URL, featured image upload, "what you'll learn" (list), total duration, gift resources
- **Tab 2 – Curriculum**: add module (name + description) → add class (name, YouTube URL, duration, description, assignment textarea, resources link)

Add any missing DB columns via migration: `courses.what_you_learn text[]`, `courses.gift_resources text`, `lessons.assignment text`, `lessons.resource_url text` (only those not present).

### 10. Coupons (missing)
- New table `coupons` (code, discount_type, discount_value, starts_at, ends_at, max_uses, used_count, active) + GRANTs + RLS (admin-only writes, authenticated read active by code)
- Apply-coupon field in checkout form
- Admin route `admin.coupons.tsx` for CRUD + rules

### 11. All Orders tab (verify)
`admin.orders.tsx` should have two tabs: **Incomplete** (pending) and **All Orders** (paid/refunded/etc).

## Technical section

- **Routes to add**: `free-class.tsx`, `checkout.error.tsx`, `_authenticated/dashboard.support.tsx`, `_authenticated/admin.categories.tsx`, `_authenticated/admin.coupons.tsx`
- **Migrations**:
  - `categories.parent_id uuid` (self-FK, nullable)
  - `coupons` table + `orders.coupon_code text` + `orders.discount_amount numeric`
  - `support_threads`, `support_replies` (+ GRANTs + RLS + `has_role('ADMIN')`-gated admin policies)
  - Any missing `courses` / `lessons` columns from §9
- **Server functions** (`src/lib/*.functions.ts`): `createIncompleteOrder`, `exportOrdersCsv`, `listCategories/upsertCategory/deleteCategory`, `applyCoupon`, `listSupportThreads/postSupportMessage`, `getAdminOverview`
- **UI**: reuse existing shadcn cards/tables and terminal design tokens; tabs via existing `<Tabs>` primitives

## Proposed execution order

1. Migrations (categories.parent_id, coupons, support tables, missing columns)
2. Landing CTAs + Free Class page + Payment Error page
3. Incomplete-order write-on-submit + Admin overview KPIs + CSV export
4. Admin Categories + Coupons pages
5. Verify/fix Admin Add-Course tab structure
6. Support Forum (student + admin views)

This is a multi-turn build. Approve the plan and I will start with step 1 (migrations), or tell me which slice to prioritize first.
