
-- 1. Remove the policy that lets students self-insert badges
DROP POLICY IF EXISTS "Students can insert own badges" ON public.student_badges;

-- 2. Scope uploads bucket INSERT to staff for sensitive folders, students only for avatars
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

CREATE POLICY "Staff can upload to uploads bucket"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'uploads'
  AND (
    -- Staff can upload anywhere
    has_role(auth.uid(), 'admin'::public.app_role)
    OR has_role(auth.uid(), 'principal'::public.app_role)
    OR has_role(auth.uid(), 'teacher'::public.app_role)
    -- Students can only upload to avatars/ folder with their own user_id prefix
    OR (
      has_role(auth.uid(), 'student'::public.app_role)
      AND (storage.foldername(name))[1] = 'avatars'
      AND name LIKE 'avatars/' || auth.uid()::text || '%'
    )
  )
);
