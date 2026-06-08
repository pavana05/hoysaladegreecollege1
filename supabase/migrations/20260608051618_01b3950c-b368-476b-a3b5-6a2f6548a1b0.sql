
-- =========================================================
-- 1) Realtime: stop leaking direct_messages via postgres_changes
-- =========================================================
DROP POLICY IF EXISTS "Users subscribe to their own channels" ON realtime.messages;

CREATE POLICY "Users subscribe to their own channels"
  ON realtime.messages
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      realtime.topic() LIKE ('dm:' || auth.uid()::text || '%')
      OR realtime.topic() LIKE ('user:' || auth.uid()::text || '%')
    )
  );

-- Remove direct_messages from the realtime publication so postgres_changes can't stream rows
ALTER PUBLICATION supabase_realtime DROP TABLE public.direct_messages;

-- =========================================================
-- 2) Lock down registration_drafts
-- =========================================================
REVOKE ALL ON public.registration_drafts FROM anon;
REVOKE ALL ON public.registration_drafts FROM authenticated;
GRANT ALL ON public.registration_drafts TO service_role;

DROP POLICY IF EXISTS "Anyone can read a registration draft by key" ON public.registration_drafts;
DROP POLICY IF EXISTS "Anyone can insert a registration draft" ON public.registration_drafts;
DROP POLICY IF EXISTS "Anyone can update a registration draft" ON public.registration_drafts;
DROP POLICY IF EXISTS "Anyone can delete a registration draft" ON public.registration_drafts;

-- Deny-all by default: only access via SECURITY DEFINER functions below
CREATE POLICY "No direct access to registration drafts"
  ON public.registration_drafts
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Save / upsert a draft using the random draft_key from the browser
CREATE OR REPLACE FUNCTION public.save_registration_draft(
  _draft_key text,
  _data jsonb,
  _step integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _draft_key IS NULL OR length(_draft_key) < 16 OR length(_draft_key) > 128 THEN
    RAISE EXCEPTION 'invalid draft key';
  END IF;

  INSERT INTO public.registration_drafts (draft_key, data, step)
  VALUES (_draft_key, COALESCE(_data, '{}'::jsonb), COALESCE(_step, 1))
  ON CONFLICT (draft_key)
  DO UPDATE SET data = EXCLUDED.data, step = EXCLUDED.step, updated_at = now();
END;
$$;

-- Load a draft by its random key only
CREATE OR REPLACE FUNCTION public.load_registration_draft(_draft_key text)
RETURNS TABLE(data jsonb, step integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _draft_key IS NULL OR length(_draft_key) < 16 OR length(_draft_key) > 128 THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT d.data, d.step
    FROM public.registration_drafts d
    WHERE d.draft_key = _draft_key
    LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_registration_draft(_draft_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _draft_key IS NULL THEN RETURN; END IF;
  DELETE FROM public.registration_drafts WHERE draft_key = _draft_key;
END;
$$;

REVOKE ALL ON FUNCTION public.save_registration_draft(text, jsonb, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.load_registration_draft(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_registration_draft(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_registration_draft(text, jsonb, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.load_registration_draft(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_registration_draft(text) TO anon, authenticated;
