
-- Job/Internship postings table
CREATE TABLE public.job_postings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  company text NOT NULL,
  description text NOT NULL DEFAULT '',
  job_type text NOT NULL DEFAULT 'internship', -- internship, full_time, part_time
  location text DEFAULT '',
  salary_range text DEFAULT '',
  eligibility_courses text[] DEFAULT '{}',
  eligibility_semester integer DEFAULT NULL,
  application_link text DEFAULT '',
  deadline date DEFAULT NULL,
  posted_by uuid DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active jobs" ON public.job_postings
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Staff can manage job postings" ON public.job_postings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'principal'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'principal'::app_role));

-- Scholarships table
CREATE TABLE public.scholarships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  provider text NOT NULL DEFAULT '',
  scholarship_type text NOT NULL DEFAULT 'government', -- government, private, merit, sports
  description text NOT NULL DEFAULT '',
  eligibility text NOT NULL DEFAULT '',
  eligible_courses text[] DEFAULT '{}',
  amount text DEFAULT '',
  application_link text DEFAULT '',
  deadline date DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  posted_by uuid DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active scholarships" ON public.scholarships
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Staff can manage scholarships" ON public.scholarships
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'principal'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'principal'::app_role));

-- Hall ticket exam sessions (admin configures exam details)
CREATE TABLE public.hall_ticket_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL, -- e.g. "Semester 3 Internal Exam - Jan 2026"
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  semester integer DEFAULT NULL,
  exam_type text NOT NULL DEFAULT 'internal',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hall_ticket_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage hall ticket sessions" ON public.hall_ticket_sessions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'principal'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'principal'::app_role));

CREATE POLICY "Authenticated can view active sessions" ON public.hall_ticket_sessions
  FOR SELECT TO authenticated USING (is_active = true);

-- Hall ticket subjects with dates
CREATE TABLE public.hall_ticket_subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.hall_ticket_sessions(id) ON DELETE CASCADE,
  subject text NOT NULL,
  exam_date date NOT NULL,
  exam_time text DEFAULT '10:00 AM - 1:00 PM',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hall_ticket_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage hall ticket subjects" ON public.hall_ticket_subjects
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'principal'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'principal'::app_role));

CREATE POLICY "Authenticated can view subjects" ON public.hall_ticket_subjects
  FOR SELECT TO authenticated USING (true);
