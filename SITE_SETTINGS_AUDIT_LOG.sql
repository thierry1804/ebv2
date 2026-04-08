-- Journal d'audit des actions sur les paramètres du site (qui, quand, quoi, comment)
-- À exécuter dans l'éditeur SQL Supabase après SITE_SETTINGS.sql

CREATE TABLE IF NOT EXISTS site_settings_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id UUID,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL DEFAULT 'site_settings',
  summary TEXT NOT NULL,
  details JSONB
);

CREATE INDEX IF NOT EXISTS idx_site_settings_audit_log_created_at
  ON site_settings_audit_log (created_at DESC);

COMMENT ON TABLE site_settings_audit_log IS 'Traçabilité des actions admin sur Paramètres site';
COMMENT ON COLUMN site_settings_audit_log.action IS 'Code stable ex. site_settings.save, site_settings.consultation';
COMMENT ON COLUMN site_settings_audit_log.summary IS 'Description courte lisible (FR)';
COMMENT ON COLUMN site_settings_audit_log.details IS 'JSON: avant/après, diff, contexte client (UA, langue), méthode technique';

ALTER TABLE site_settings_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read site settings audit" ON site_settings_audit_log;
DROP POLICY IF EXISTS "Authenticated users can insert site settings audit" ON site_settings_audit_log;

CREATE POLICY "Authenticated users can read site settings audit" ON site_settings_audit_log
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert site settings audit" ON site_settings_audit_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
