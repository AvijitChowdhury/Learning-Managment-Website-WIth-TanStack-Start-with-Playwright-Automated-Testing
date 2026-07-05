
-- Categories: sub-category + description
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description text;

-- Courses: extra basic-info fields
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS what_you_learn text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS gift_resources text,
  ADD COLUMN IF NOT EXISTS intro_video_url text,
  ADD COLUMN IF NOT EXISTS total_duration text;

-- Lessons: curriculum extras
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS assignment text,
  ADD COLUMN IF NOT EXISTS resource_url text;

-- Orders: coupon tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0;

-- Coupons
DO $$ BEGIN
  CREATE TYPE public.coupon_discount_type AS ENUM ('PERCENT', 'FLAT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type public.coupon_discount_type NOT NULL DEFAULT 'PERCENT',
  discount_value numeric(10,2) NOT NULL,
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons_read_active" ON public.coupons
  FOR SELECT TO authenticated
  USING (active = true);

CREATE POLICY "coupons_admin_all" ON public.coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Support forum
CREATE TABLE IF NOT EXISTS public.support_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.support_threads TO authenticated;
GRANT ALL ON public.support_threads TO service_role;

ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_threads_own_read" ON public.support_threads
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "support_threads_own_insert" ON public.support_threads
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "support_threads_admin_update" ON public.support_threads
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN') OR auth.uid() = user_id)
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN') OR auth.uid() = user_id);

CREATE TRIGGER support_threads_updated_at BEFORE UPDATE ON public.support_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.support_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.support_replies TO authenticated;
GRANT ALL ON public.support_replies TO service_role;

ALTER TABLE public.support_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_replies_thread_read" ON public.support_replies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_threads t
      WHERE t.id = thread_id
        AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'))
    )
  );

CREATE POLICY "support_replies_insert" ON public.support_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.support_threads t
      WHERE t.id = thread_id
        AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'))
    )
  );

CREATE INDEX IF NOT EXISTS support_replies_thread_idx ON public.support_replies(thread_id);
CREATE INDEX IF NOT EXISTS support_threads_user_idx ON public.support_threads(user_id);
