-- Temporarily disable the trigger to allow bulk update
ALTER TABLE public.students DISABLE TRIGGER trg_protect_student_fields;

UPDATE public.students 
SET academic_year_id = 'a1e1ad90-ce37-437a-bd32-077aea44bb20' 
WHERE academic_year_id IS NULL;

-- Re-enable the trigger
ALTER TABLE public.students ENABLE TRIGGER trg_protect_student_fields;