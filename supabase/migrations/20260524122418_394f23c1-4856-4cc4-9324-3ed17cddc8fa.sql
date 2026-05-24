ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS previous_school text DEFAULT '',
  ADD COLUMN IF NOT EXISTS emergency_contact_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS emergency_contact_relation text DEFAULT '';