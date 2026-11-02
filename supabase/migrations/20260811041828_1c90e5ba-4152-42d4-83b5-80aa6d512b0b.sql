CREATE POLICY "signed in users can read dish photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'foods');