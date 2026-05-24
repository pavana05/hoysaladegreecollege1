
-- 1. Secure get_student_peers RPC: require auth, revoke from anon
CREATE OR REPLACE FUNCTION public.get_student_peers(_user_id uuid)
RETURNS TABLE(id uuid, user_id uuid, roll_number text, course_id uuid, semester integer, year_level integer, full_name text, avatar_url text, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT s.id, s.user_id, s.roll_number, s.course_id, s.semester, s.year_level,
         p.full_name, p.avatar_url, p.email
  FROM public.students s
  JOIN public.profiles p ON p.user_id = s.user_id
  WHERE s.is_active = true
    AND s.user_id != _user_id
    AND auth.uid() IS NOT NULL
    AND auth.uid() = _user_id;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_student_peers(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_peers(uuid) TO authenticated;

-- Same hardening for get_application_status (anonymous lookup by email + app number is the intended use, keep but at least ensure search_path is set; already set)
REVOKE EXECUTE ON FUNCTION public.get_students_for_teacher() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_students_for_teacher() TO authenticated;

-- 2. Faculty members: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view active faculty" ON public.faculty_members;
CREATE POLICY "Authenticated users can view active faculty"
  ON public.faculty_members
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 3. Realtime channel authorization: restrict realtime.messages so users can
-- only subscribe to topics scoped to their own user_id (used for DM channels).
-- This is the standard Supabase pattern for Realtime channel authorization.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users subscribe to their own channels" ON realtime.messages;
CREATE POLICY "Users subscribe to their own channels"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Allow postgres_changes (table-level changes, governed by underlying RLS)
      extension = 'postgres_changes'
      -- Or user-scoped broadcast/presence topics: dm:<userId> or user:<userId>
      OR realtime.topic() LIKE 'dm:' || auth.uid()::text || '%'
      OR realtime.topic() LIKE 'user:' || auth.uid()::text || '%'
    )
  );

DROP POLICY IF EXISTS "Users broadcast to their own channels" ON realtime.messages;
CREATE POLICY "Users broadcast to their own channels"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      realtime.topic() LIKE 'dm:' || auth.uid()::text || '%'
      OR realtime.topic() LIKE 'user:' || auth.uid()::text || '%'
    )
  );
