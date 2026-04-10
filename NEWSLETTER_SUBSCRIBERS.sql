-- Newsletter : table, RLS, RPC subscribe / unsubscribe
-- Exécuter dans le SQL Editor Supabase après revue.
--
-- Consentement : la version envoyée par le front doit correspondre à
-- NEWSLETTER_CONSENT_VERSION dans src/lib/newsletterConsent.ts (ex. v1-2026-04).

-- ============================================
-- Table
-- ============================================

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('footer', 'home')),
  consent_version text NOT NULL,
  unsubscribed_at timestamptz,
  unsubscribe_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  CONSTRAINT newsletter_subscribers_email_key UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_unsubscribe_token
  ON newsletter_subscribers (unsubscribe_token);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_active
  ON newsletter_subscribers (email)
  WHERE unsubscribed_at IS NULL;

-- ============================================
-- RLS
-- ============================================

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can select newsletter subscribers" ON newsletter_subscribers;
CREATE POLICY "Authenticated can select newsletter subscribers"
  ON newsletter_subscribers
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Pas d'INSERT/UPDATE/DELETE public directs : uniquement via RPC (SECURITY DEFINER).

GRANT SELECT ON public.newsletter_subscribers TO authenticated;

-- ============================================
-- RPC : inscription
-- ============================================

CREATE OR REPLACE FUNCTION public.subscribe_newsletter(
  p_email text,
  p_source text,
  p_consent boolean,
  p_consent_version text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_row newsletter_subscribers%ROWTYPE;
BEGIN
  IF NOT COALESCE(p_consent, false) THEN
    RETURN json_build_object('ok', false, 'error', 'consent_required');
  END IF;

  v_email := lower(trim(COALESCE(p_email, '')));
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(v_email) > 254 THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_email');
  END IF;

  IF p_source IS NULL OR p_source NOT IN ('footer', 'home') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_source');
  END IF;

  IF p_consent_version IS NULL OR length(trim(p_consent_version)) = 0 OR length(p_consent_version) > 64 THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_consent_version');
  END IF;

  SELECT * INTO v_row FROM newsletter_subscribers WHERE email = v_email;

  IF NOT FOUND THEN
    INSERT INTO newsletter_subscribers (email, source, consent_version)
    VALUES (v_email, p_source, p_consent_version);
    RETURN json_build_object('ok', true, 'status', 'subscribed');
  END IF;

  IF v_row.unsubscribed_at IS NULL THEN
    RETURN json_build_object('ok', true, 'status', 'already_subscribed');
  END IF;

  UPDATE newsletter_subscribers
  SET
    unsubscribed_at = NULL,
    subscribed_at = now(),
    source = p_source,
    consent_version = p_consent_version,
    unsubscribe_token = gen_random_uuid()
  WHERE email = v_email;

  RETURN json_build_object('ok', true, 'status', 'resubscribed');
END;
$$;

-- ============================================
-- RPC : désinscription
-- ============================================

CREATE OR REPLACE FUNCTION public.unsubscribe_newsletter(p_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count int;
  v_exists boolean;
BEGIN
  IF p_token IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'missing_token');
  END IF;

  UPDATE newsletter_subscribers
  SET unsubscribed_at = now()
  WHERE unsubscribe_token = p_token AND unsubscribed_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count > 0 THEN
    RETURN json_build_object('ok', true, 'status', 'unsubscribed');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM newsletter_subscribers WHERE unsubscribe_token = p_token
  ) INTO v_exists;

  IF v_exists THEN
    RETURN json_build_object('ok', true, 'status', 'already_unsubscribed');
  END IF;

  RETURN json_build_object('ok', false, 'error', 'invalid_token');
END;
$$;

-- ============================================
-- Droits d'exécution (client anon + authentifié)
-- ============================================

GRANT EXECUTE ON FUNCTION public.subscribe_newsletter(text, text, boolean, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unsubscribe_newsletter(uuid) TO anon, authenticated;
