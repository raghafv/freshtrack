CREATE POLICY "support upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "support read own or admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'support-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'raghav.goyal909@gmail.com'
    )
  );