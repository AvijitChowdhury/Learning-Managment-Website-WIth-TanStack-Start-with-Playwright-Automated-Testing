
DROP POLICY IF EXISTS lessons_public_meta ON public.lessons;

CREATE POLICY lessons_free_preview_read ON public.lessons
FOR SELECT TO anon, authenticated
USING (
  is_free_preview = true
  AND EXISTS (
    SELECT 1 FROM public.modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = lessons.module_id AND c.is_published = true
  )
);

CREATE POLICY lessons_enrolled_read ON public.lessons
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.modules m
    JOIN public.enrollments e ON e.course_id = m.course_id
    WHERE m.id = lessons.module_id AND e.user_id = auth.uid()
  )
);
