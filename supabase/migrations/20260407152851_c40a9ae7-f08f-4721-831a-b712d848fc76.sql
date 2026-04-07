-- Assign current academic year to all students without one
UPDATE public.students 
SET academic_year_id = 'a1e1ad90-ce37-437a-bd32-077aea44bb20' 
WHERE academic_year_id IS NULL;