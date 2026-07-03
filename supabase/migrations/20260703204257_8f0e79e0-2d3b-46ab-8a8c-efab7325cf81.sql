
CREATE POLICY "thumb_public_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'course-thumbnails');
CREATE POLICY "thumb_admin_write" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'course-thumbnails' AND public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (bucket_id = 'course-thumbnails' AND public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "video_admin_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'course-videos' AND public.has_role(auth.uid(), 'ADMIN'))
  WITH CHECK (bucket_id = 'course-videos' AND public.has_role(auth.uid(), 'ADMIN'));
