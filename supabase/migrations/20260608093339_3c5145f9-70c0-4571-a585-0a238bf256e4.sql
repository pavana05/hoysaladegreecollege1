
-- 1) Table
CREATE TABLE public.app_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  version_code integer NOT NULL DEFAULT 1,
  apk_url text NOT NULL,
  apk_size_bytes bigint,
  release_notes text[] NOT NULL DEFAULT '{}',
  force_update boolean NOT NULL DEFAULT false,
  min_supported_version text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_updates_active_created ON public.app_updates (is_active, created_at DESC);

-- 2) Grants (required for Data API)
GRANT SELECT ON public.app_updates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_updates TO authenticated;
GRANT ALL ON public.app_updates TO service_role;

-- 3) RLS
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

-- Anyone can read active releases (used by the in-app updater, even pre-login)
CREATE POLICY "Anyone can read active app updates"
  ON public.app_updates FOR SELECT
  USING (is_active = true);

-- Admins/Principals can read everything (history, drafts)
CREATE POLICY "Admins/Principals read all app updates"
  ON public.app_updates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'principal'::app_role));

CREATE POLICY "Admins/Principals insert app updates"
  ON public.app_updates FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'principal'::app_role));

CREATE POLICY "Admins/Principals update app updates"
  ON public.app_updates FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'principal'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'principal'::app_role));

CREATE POLICY "Admins/Principals delete app updates"
  ON public.app_updates FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'principal'::app_role));

-- 4) updated_at trigger
CREATE TRIGGER app_updates_set_updated_at
  BEFORE UPDATE ON public.app_updates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5) Storage policies on 'app-releases' bucket
-- Anyone (anon + authenticated) can read APK files so the in-app updater can download them
CREATE POLICY "Public read app-releases"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'app-releases');

CREATE POLICY "Admins/Principals upload app-releases"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'app-releases'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'principal'::app_role))
  );

CREATE POLICY "Admins/Principals update app-releases"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'app-releases'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'principal'::app_role))
  );

CREATE POLICY "Admins/Principals delete app-releases"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'app-releases'
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'principal'::app_role))
  );
