
-- Create fee_concessions table
CREATE TABLE public.fee_concessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  concession_type text NOT NULL DEFAULT 'other',
  concession_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  is_percentage boolean NOT NULL DEFAULT false,
  reason text DEFAULT '',
  semester integer,
  academic_year text,
  approved_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fee_concessions ENABLE ROW LEVEL SECURITY;

-- Staff can manage concessions
CREATE POLICY "Staff can manage fee concessions"
ON public.fee_concessions FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'principal'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'principal'::app_role)
);

-- Students can view own concessions
CREATE POLICY "Students can view own concessions"
ON public.fee_concessions FOR SELECT TO authenticated
USING (
  student_id IN (
    SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
  )
);

-- Update trigger
CREATE TRIGGER update_fee_concessions_updated_at
  BEFORE UPDATE ON public.fee_concessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
