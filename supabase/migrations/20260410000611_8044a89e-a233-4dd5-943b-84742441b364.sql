
-- Add joined_at column to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS joined_at timestamptz DEFAULT now();

-- Backfill existing records with their created_at value
UPDATE public.students SET joined_at = created_at WHERE joined_at IS NULL;
