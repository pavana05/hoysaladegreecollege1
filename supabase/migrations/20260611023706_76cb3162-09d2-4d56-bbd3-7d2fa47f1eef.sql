DELETE FROM public.app_updates WHERE is_test = true;
DROP INDEX IF EXISTS public.idx_app_updates_test;
ALTER TABLE public.app_updates DROP COLUMN IF EXISTS is_test;