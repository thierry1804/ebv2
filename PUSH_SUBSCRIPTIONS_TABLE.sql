-- Web Push : table des abonnements push des admins
-- Exécuter dans le SQL Editor Supabase après revue.

-- ============================================
-- Table
-- ============================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  endpoint text NOT NULL UNIQUE,
  keys_p256dh text NOT NULL,
  keys_auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_email
  ON push_subscriptions (user_email);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs authentifiés peuvent gérer leurs propres abonnements
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (auth.jwt() ->> 'email' = user_email)
  WITH CHECK (auth.jwt() ->> 'email' = user_email);

-- Lecture pour le service role (Edge Functions) — le service_role bypass RLS par défaut,
-- donc pas besoin de policy supplémentaire pour l'Edge Function.
