ALTER TABLE public.app_updates ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_app_updates_test ON public.app_updates (is_test, created_by);