
-- Instructors content table (admin-managed profiles, no user account required)
CREATE TABLE public.instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  headline text,
  bio text,
  avatar_url text,
  cover_url text,
  expertise text[] NOT NULL DEFAULT '{}',
  years_experience integer,
  website_url text,
  twitter_url text,
  linkedin_url text,
  github_url text,
  youtube_url text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.instructors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instructors TO authenticated;
GRANT ALL ON public.instructors TO service_role;

ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "instructors_public_read"
  ON public.instructors FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "instructors_admin_read_all"
  ON public.instructors FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "instructors_admin_write"
  ON public.instructors FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

CREATE TRIGGER instructors_set_updated_at
  BEFORE UPDATE ON public.instructors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Link courses to instructor profile (separate from existing user-based instructor_id)
ALTER TABLE public.courses
  ADD COLUMN instructor_profile_id uuid REFERENCES public.instructors(id) ON DELETE SET NULL;

CREATE INDEX courses_instructor_profile_idx ON public.courses(instructor_profile_id);
