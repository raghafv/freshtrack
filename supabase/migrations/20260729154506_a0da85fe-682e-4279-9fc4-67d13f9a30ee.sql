
CREATE POLICY "pantry images own read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'pantry-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "pantry images own write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pantry-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "pantry images own delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'pantry-images' AND (storage.foldername(name))[1] = auth.uid()::text);
