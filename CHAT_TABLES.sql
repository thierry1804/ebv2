-- Chat en temps réel : tables, index, RLS
-- Exécuter dans le SQL Editor Supabase après revue.

-- ============================================
-- Table : conversations
-- ============================================

CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  product_image text,
  customer_name text NOT NULL DEFAULT 'Visiteur',
  customer_email text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  unread_admin integer NOT NULL DEFAULT 0,
  unread_customer integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_product
  ON chat_conversations (product_id);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_status
  ON chat_conversations (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_customer_email
  ON chat_conversations (customer_email)
  WHERE customer_email IS NOT NULL;

-- ============================================
-- Table : messages
-- ============================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('customer', 'admin', 'system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON chat_messages (conversation_id, created_at ASC);

-- ============================================
-- Trigger : mettre à jour updated_at sur la conversation à chaque message
-- ============================================

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS trigger AS $$
BEGIN
  UPDATE chat_conversations
  SET updated_at = now(),
      unread_admin = CASE WHEN NEW.sender_role = 'customer' THEN unread_admin + 1 ELSE unread_admin END,
      unread_customer = CASE WHEN NEW.sender_role = 'admin' THEN unread_customer + 1 ELSE unread_customer END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_conversation_on_message ON chat_messages;
CREATE TRIGGER trg_update_conversation_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- ============================================
-- RLS : chat_conversations
-- ============================================

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut créer une conversation (visiteurs non authentifiés inclus)
DROP POLICY IF EXISTS "Anyone can insert chat conversations" ON chat_conversations;
CREATE POLICY "Anyone can insert chat conversations"
  ON chat_conversations
  FOR INSERT
  WITH CHECK (true);

-- Tout le monde peut lire (le filtrage se fait côté app via session_id ou email)
DROP POLICY IF EXISTS "Anyone can select chat conversations" ON chat_conversations;
CREATE POLICY "Anyone can select chat conversations"
  ON chat_conversations
  FOR SELECT
  USING (true);

-- Admins authentifiés : mise à jour complète (statut, non-lus, etc.)
DROP POLICY IF EXISTS "Authenticated can update chat conversations" ON chat_conversations;
CREATE POLICY "Authenticated can update chat conversations"
  ON chat_conversations
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Visiteurs non connectés : le widget appelle UPDATE unread_customer = 0 (markRead).
-- Sans cette politique, la requête est refusée par la RLS (le reste du chat peut sembler « bloqué » selon le flux).
DROP POLICY IF EXISTS "Anyone can update chat conversations for client markRead" ON chat_conversations;
CREATE POLICY "Anyone can update chat conversations for client markRead"
  ON chat_conversations
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- RLS : chat_messages
-- ============================================

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut envoyer un message
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON chat_messages;
CREATE POLICY "Anyone can insert chat messages"
  ON chat_messages
  FOR INSERT
  WITH CHECK (true);

-- Tout le monde peut lire les messages (filtré côté app par conversation_id)
DROP POLICY IF EXISTS "Anyone can select chat messages" ON chat_messages;
CREATE POLICY "Anyone can select chat messages"
  ON chat_messages
  FOR SELECT
  USING (true);

-- ============================================
-- Realtime : activer les publications (idempotent)
-- ============================================
-- ADD TABLE échoue si la table est déjà dans la publication (42710).

DO $pub$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
  END IF;
END
$pub$;
