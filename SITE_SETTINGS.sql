-- Paramètres globaux du site (mode maintenance, etc.)
-- À exécuter dans l'éditeur SQL Supabase.

CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  maintenance_enabled BOOLEAN NOT NULL DEFAULT false,
  maintenance_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO site_settings (id, maintenance_enabled, maintenance_message)
VALUES ('global', false, NULL)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read site settings" ON site_settings;
DROP POLICY IF EXISTS "Authenticated users can manage site settings" ON site_settings;

-- Lecture publique : nécessaire pour afficher la page maintenance sans être connecté
CREATE POLICY "Anyone can read site settings" ON site_settings
  FOR SELECT USING (true);

-- Écriture : utilisateurs authentifiés (backoffice). Pour la prod avec admins uniquement,
-- adaptez comme pour les autres tables (voir FIX_RLS_POLICIES.sql).
CREATE POLICY "Authenticated users can manage site settings" ON site_settings
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
