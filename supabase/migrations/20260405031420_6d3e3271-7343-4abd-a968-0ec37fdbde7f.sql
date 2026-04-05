
-- Replace the overly broad ALL policy with explicit per-command policies for admin
-- This prevents any authenticated non-admin from inserting roles

-- Drop the existing ALL policy that could allow unintended access
DROP POLICY IF EXISTS "Admin can manage roles" ON public.user_roles;

-- Add explicit per-command policies for admin
CREATE POLICY "Admin can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Also replace the Principal ALL policy with explicit per-command policies
DROP POLICY IF EXISTS "Principal can manage teacher and student roles" ON public.user_roles;

CREATE POLICY "Principal can insert teacher/student roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'principal'::app_role) AND role IN ('teacher'::app_role, 'student'::app_role));

CREATE POLICY "Principal can update teacher/student roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'principal'::app_role) AND role IN ('teacher'::app_role, 'student'::app_role))
  WITH CHECK (has_role(auth.uid(), 'principal'::app_role) AND role IN ('teacher'::app_role, 'student'::app_role));

CREATE POLICY "Principal can delete teacher/student roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'principal'::app_role) AND role IN ('teacher'::app_role, 'student'::app_role));
