CREATE POLICY "pantry images own update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'pantry-images' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'pantry-images' AND auth.uid()::text = (storage.foldername(name))[1]);