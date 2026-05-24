
-- =========================================
-- 1. STUDENT SENSITIVE DATA ISOLATION
-- =========================================
CREATE TABLE IF NOT EXISTS public.student_sensitive_data (
  student_id uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  aadhaar_number text,
  caste text,
  religion text,
  category text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Migrate existing data
INSERT INTO public.student_sensitive_data (student_id, aadhaar_number, caste, religion, category)
SELECT id, aadhaar_number, caste, religion, category
FROM public.students
WHERE aadhaar_number IS NOT NULL
   OR caste IS NOT NULL
   OR religion IS NOT NULL
   OR category IS NOT NULL
ON CONFLICT (student_id) DO NOTHING;

-- Update protect_student_fields trigger BEFORE dropping the cols
CREATE OR REPLACE FUNCTION public.protect_student_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF has_role(auth.uid(), 'admin'::app_role)
     OR has_role(auth.uid(), 'principal'::app_role)
     OR has_role(auth.uid(), 'teacher'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.roll_number := OLD.roll_number;
  NEW.course_id := OLD.course_id;
  NEW.semester := OLD.semester;
  NEW.admission_year := OLD.admission_year;
  NEW.is_active := OLD.is_active;
  NEW.total_fee := OLD.total_fee;
  NEW.fee_paid := OLD.fee_paid;
  NEW.fee_due_date := OLD.fee_due_date;
  NEW.fee_remarks := OLD.fee_remarks;
  NEW.year_level := OLD.year_level;
  NEW.academic_year_id := OLD.academic_year_id;
  NEW.nationality := OLD.nationality;
  NEW.blood_group := OLD.blood_group;
  NEW.gender := OLD.gender;
  NEW.user_id := OLD.user_id;
  NEW.created_at := OLD.created_at;

  RETURN NEW;
END;
$function$;

-- Drop sensitive columns from students
ALTER TABLE public.students
  DROP COLUMN IF EXISTS aadhaar_number,
  DROP COLUMN IF EXISTS caste,
  DROP COLUMN IF EXISTS religion,
  DROP COLUMN IF EXISTS category;

-- RLS for new table
ALTER TABLE public.student_sensitive_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Principal manage sensitive data"
  ON public.student_sensitive_data
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'principal'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'principal'::app_role));

CREATE POLICY "Students view own sensitive data"
  ON public.student_sensitive_data
  FOR SELECT
  TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE TRIGGER update_student_sensitive_data_updated_at
  BEFORE UPDATE ON public.student_sensitive_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =========================================
-- 2. FACULTY DIRECTORY PRIVACY
-- =========================================
DROP POLICY IF EXISTS "Anyone can view active faculty" ON public.faculty_members;

CREATE POLICY "Staff can view faculty"
  ON public.faculty_members
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'principal'::app_role)
    OR has_role(auth.uid(), 'teacher'::app_role)
  );

-- Public-safe view (excludes email/phone)
CREATE OR REPLACE VIEW public.faculty_directory
WITH (security_invoker = false) AS
SELECT
  id, name, role, department, qualification, experience,
  subjects, photo_url, is_active, sort_order, created_at
FROM public.faculty_members
WHERE is_active = true
ORDER BY sort_order, created_at;

GRANT SELECT ON public.faculty_directory TO anon, authenticated;

-- =========================================
-- 3. REALTIME CHANNEL HARDENING
-- =========================================
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can subscribe to realtime" ON realtime.messages;
CREATE POLICY "Authenticated can subscribe to realtime"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (true);
