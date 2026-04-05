-- Fix 1: Restrict message-attachments INSERT to own folder only
DROP POLICY IF EXISTS "Authenticated users can upload message attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload message attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix 2: Restrict admission-photos INSERT to staff only (was open to anyone)
DROP POLICY IF EXISTS "Anyone can upload admission photos" ON storage.objects;
CREATE POLICY "Staff can upload admission photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'admission-photos'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'principal'::app_role)
  )
);

-- Fix 3: Update message-attachments SELECT to allow message receivers to view attachments
DROP POLICY IF EXISTS "Users can view own message attachments" ON storage.objects;
CREATE POLICY "Users can view own or received message attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.direct_messages dm
      WHERE dm.receiver_id = auth.uid()
        AND dm.file_url LIKE '%' || objects.name
    )
  )
);