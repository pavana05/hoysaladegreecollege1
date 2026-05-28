
-- Cleanup: empty strings -> null on sensitive data so the unique partial index can be applied
UPDATE public.student_sensitive_data SET aadhaar_number = NULL WHERE aadhaar_number IS NOT NULL AND TRIM(aadhaar_number) = '';

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS uucms_id text,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

ALTER TABLE public.students ALTER COLUMN roll_number DROP NOT NULL;

ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_approval_status_check;
ALTER TABLE public.students ADD CONSTRAINT students_approval_status_check
  CHECK (approval_status IN ('pending','approved','rejected'));

UPDATE public.students SET approval_status = 'approved', approved_at = COALESCE(approved_at, created_at)
  WHERE approval_status = 'pending' AND created_at < now() - interval '1 minute';

CREATE UNIQUE INDEX IF NOT EXISTS students_uucms_id_uniq
  ON public.students (LOWER(uucms_id)) WHERE uucms_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS students_approval_status_idx ON public.students (approval_status);

CREATE UNIQUE INDEX IF NOT EXISTS student_sensitive_aadhaar_uniq
  ON public.student_sensitive_data (aadhaar_number) WHERE aadhaar_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view settings" ON public.app_settings;
CREATE POLICY "Anyone authenticated can view settings"
  ON public.app_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin/Principal can manage settings" ON public.app_settings;
CREATE POLICY "Admin/Principal can manage settings"
  ON public.app_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'principal'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'principal'::app_role));

INSERT INTO public.app_settings (key, value) VALUES
  ('student_auto_approve', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.check_registration_duplicates(
  _email text, _uucms text, _aadhaar text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_taken boolean := false;
  uucms_taken boolean := false;
  aadhaar_taken boolean := false;
BEGIN
  IF _email IS NOT NULL AND _email <> '' THEN
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(email) = LOWER(_email)) INTO email_taken;
  END IF;
  IF _uucms IS NOT NULL AND _uucms <> '' THEN
    SELECT EXISTS (SELECT 1 FROM public.students WHERE LOWER(uucms_id) = LOWER(_uucms)) INTO uucms_taken;
  END IF;
  IF _aadhaar IS NOT NULL AND _aadhaar <> '' THEN
    SELECT EXISTS (SELECT 1 FROM public.student_sensitive_data WHERE aadhaar_number = _aadhaar) INTO aadhaar_taken;
  END IF;
  RETURN jsonb_build_object(
    'email_taken', email_taken,
    'uucms_taken', uucms_taken,
    'aadhaar_taken', aadhaar_taken,
    'any_duplicate', (email_taken OR uucms_taken OR aadhaar_taken)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_registration_duplicates(text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_requested_role TEXT;
  assigned_role app_role;
  v_uucms text;
  v_aadhaar text;
  v_auto_approve boolean := false;
  v_new_student_id uuid;
  v_status text;
  v_active boolean;
BEGIN
  user_requested_role := NEW.raw_user_meta_data->>'role';
  v_uucms := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'uucms_id','')), '');
  v_aadhaar := NULLIF(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'aadhaar_number',''), '\D','','g'), '');

  IF user_requested_role IN ('student', 'teacher') THEN
    assigned_role := user_requested_role::app_role;
  ELSE
    assigned_role := 'student'::app_role;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);

  IF assigned_role = 'student' THEN
    SELECT COALESCE((value->>'enabled')::boolean, false) INTO v_auto_approve
    FROM public.app_settings WHERE key = 'student_auto_approve';

    IF v_auto_approve THEN
      v_status := 'approved'; v_active := true;
    ELSE
      v_status := 'pending'; v_active := false;
    END IF;

    INSERT INTO public.students (user_id, uucms_id, is_active, approval_status, approved_at)
    VALUES (NEW.id, v_uucms, v_active, v_status, CASE WHEN v_auto_approve THEN now() ELSE NULL END)
    RETURNING id INTO v_new_student_id;

    IF v_aadhaar IS NOT NULL THEN
      INSERT INTO public.student_sensitive_data (student_id, aadhaar_number)
      VALUES (v_new_student_id, v_aadhaar)
      ON CONFLICT (student_id) DO UPDATE SET aadhaar_number = EXCLUDED.aadhaar_number;
    END IF;
  END IF;

  IF assigned_role = 'teacher' THEN
    INSERT INTO public.teachers (user_id, employee_id, is_active)
    VALUES (NEW.id, 'EMP-' || substr(NEW.id::text, 1, 8), true);
  END IF;

  RETURN NEW;
END;
$$;
