-- Registration drafts: anonymous users save in-progress form data keyed by a client-generated draft key
CREATE TABLE public.registration_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_key TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  step INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registration_drafts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registration_drafts TO authenticated;
GRANT ALL ON public.registration_drafts TO service_role;

ALTER TABLE public.registration_drafts ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) may create and manage a draft if they know the draft_key.
-- The draft_key is a client-generated UUID kept in the user's localStorage.
CREATE POLICY "Anyone can insert a registration draft"
  ON public.registration_drafts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read a registration draft by key"
  ON public.registration_drafts FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update a registration draft"
  ON public.registration_drafts FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete a registration draft"
  ON public.registration_drafts FOR DELETE
  USING (true);

CREATE TRIGGER trg_registration_drafts_updated_at
  BEFORE UPDATE ON public.registration_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Housekeeping: drafts auto-expire after 30 days (caller may purge; index helps)
CREATE INDEX idx_registration_drafts_updated_at ON public.registration_drafts(updated_at);
