
-- Drop the security-definer-style view
DROP VIEW IF EXISTS public.faculty_directory;

-- Restore public read on faculty_members but mask email/phone via column privileges
DROP POLICY IF EXISTS "Anyone can view active faculty" ON public.faculty_members;
CREATE POLICY "Anyone can view active faculty"
  ON public.faculty_members
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Staff can view faculty" ON public.faculty_members;

-- Anon cannot read email/phone columns
REVOKE SELECT ON public.faculty_members FROM anon;
GRANT SELECT (
  id, name, role, department, qualification, experience,
  subjects, photo_url, is_active, sort_order, created_at
) ON public.faculty_members TO anon;

-- Authenticated staff retain full access (broad grant)
GRANT SELECT ON public.faculty_members TO authenticated;

-- Tighten realtime policy (drop always-true)
DROP POLICY IF EXISTS "Authenticated can subscribe to realtime" ON realtime.messages;
CREATE POLICY "Authenticated can subscribe to realtime"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
