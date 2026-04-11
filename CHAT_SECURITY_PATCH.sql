-- Patch sécurité chat — Exécuter dans le SQL Editor Supabase
-- Ce script durcit les RLS et ajoute des contraintes de validation.

-- ============================================
-- 1. Ajouter session_token aux conversations
--    (permet d'identifier un visiteur sans auth)
-- ============================================

ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS session_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_chat_conversations_session_token
  ON chat_conversations (session_token);

-- ============================================
-- 2. Contraintes de validation sur les données
-- ============================================

-- Longueur max du contenu d'un message (5000 caractères)
ALTER TABLE chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_content_length;
ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_content_length CHECK (char_length(content) BETWEEN 1 AND 5000);

-- Longueur max du nom client (100 caractères)
ALTER TABLE chat_conversations
  DROP CONSTRAINT IF EXISTS chat_conversations_name_length;
ALTER TABLE chat_conversations
  ADD CONSTRAINT chat_conversations_name_length CHECK (char_length(customer_name) BETWEEN 1 AND 100);

-- Format email basique si fourni
ALTER TABLE chat_conversations
  DROP CONSTRAINT IF EXISTS chat_conversations_email_format;
ALTER TABLE chat_conversations
  ADD CONSTRAINT chat_conversations_email_format CHECK (
    customer_email IS NULL OR customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

-- ============================================
-- 3. Rate limiting via fonction (max 1 conversation / minute / session)
-- ============================================

CREATE OR REPLACE FUNCTION check_chat_rate_limit()
RETURNS trigger AS $$
BEGIN
  -- Max 1 conversation par session_token par minute
  IF EXISTS (
    SELECT 1 FROM chat_conversations
    WHERE session_token = NEW.session_token
      AND created_at > now() - interval '1 minute'
  ) THEN
    RAISE EXCEPTION 'Trop de demandes. Veuillez patienter avant de créer une nouvelle discussion.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_rate_limit ON chat_conversations;
CREATE TRIGGER trg_chat_rate_limit
  BEFORE INSERT ON chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION check_chat_rate_limit();

-- Rate limit messages : max 10 messages par minute par conversation par sender_role
CREATE OR REPLACE FUNCTION check_message_rate_limit()
RETURNS trigger AS $$
BEGIN
  IF (
    SELECT count(*) FROM chat_messages
    WHERE conversation_id = NEW.conversation_id
      AND sender_role = NEW.sender_role
      AND created_at > now() - interval '1 minute'
  ) >= 10 THEN
    RAISE EXCEPTION 'Trop de messages envoyés. Veuillez patienter.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_message_rate_limit ON chat_messages;
CREATE TRIGGER trg_message_rate_limit
  BEFORE INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION check_message_rate_limit();

-- ============================================
-- 4. RLS durcie — chat_conversations
-- ============================================

-- Supprimer les anciennes policies trop permissives
DROP POLICY IF EXISTS "Anyone can insert chat conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Anyone can select chat conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Authenticated can update chat conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Anyone can update chat conversations for client markRead" ON chat_conversations;

-- INSERT : tout le monde peut créer, mais un session_token doit être présent
DROP POLICY IF EXISTS "chat_conv_insert" ON chat_conversations;
CREATE POLICY "chat_conv_insert"
  ON chat_conversations
  FOR INSERT
  WITH CHECK (
    -- Les admins (authenticated) peuvent tout insérer
    auth.role() = 'authenticated'
    -- Les visiteurs (anon) : session_token obligatoire (il a un DEFAULT gen_random_uuid donc toujours non NULL)
    OR session_token IS NOT NULL
  );

-- Assurer que anon a bien les privilèges table (Supabase les donne par défaut, mais on force)
GRANT INSERT, SELECT ON chat_conversations TO anon;
GRANT INSERT, SELECT ON chat_messages TO anon;

-- SELECT : les admins voient tout, les visiteurs seulement par session_token
-- Note : le session_token est passé via un header custom x-session-token
-- Comme Supabase anon ne peut pas filtrer par header dans RLS, on ouvre le SELECT
-- mais on filtre côté application. Alternative : passer le token en paramètre RPC.
-- Pour la sécurité, on utilise une RPC à la place du SELECT direct.
DROP POLICY IF EXISTS "chat_conv_select_admin" ON chat_conversations;
CREATE POLICY "chat_conv_select_admin"
  ON chat_conversations
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Les visiteurs passent par une RPC sécurisée (voir ci-dessous)

-- UPDATE : admin seulement (fermer, rouvrir, reset unread)
DROP POLICY IF EXISTS "chat_conv_update_admin" ON chat_conversations;
CREATE POLICY "chat_conv_update_admin"
  ON chat_conversations
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- ============================================
-- 5. RLS durcie — chat_messages
-- ============================================

DROP POLICY IF EXISTS "Anyone can insert chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Anyone can select chat messages" ON chat_messages;

-- INSERT : visiteurs ne peuvent envoyer que sender_role = 'customer' ou 'system'
-- Les admins (authenticated) peuvent envoyer en 'admin'
DROP POLICY IF EXISTS "chat_msg_insert" ON chat_messages;
CREATE POLICY "chat_msg_insert"
  ON chat_messages
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    OR sender_role IN ('customer', 'system')
  );

-- SELECT : admin voit tout, visiteur par conversation_id (via RPC)
DROP POLICY IF EXISTS "chat_msg_select_admin" ON chat_messages;
CREATE POLICY "chat_msg_select_admin"
  ON chat_messages
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================
-- 6. RPC sécurisées pour les visiteurs
-- ============================================

-- Récupérer sa conversation par session_token + product_id
CREATE OR REPLACE FUNCTION get_my_chat_conversation(
  p_session_token uuid,
  p_product_id uuid
)
RETURNS SETOF chat_conversations
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM chat_conversations
  WHERE session_token = p_session_token
    AND product_id = p_product_id
    AND status = 'open'
  ORDER BY updated_at DESC
  LIMIT 1;
$$;

-- Récupérer les messages d'une conversation (vérifie que le session_token correspond)
CREATE OR REPLACE FUNCTION get_my_chat_messages(
  p_session_token uuid,
  p_conversation_id uuid
)
RETURNS SETOF chat_messages
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.* FROM chat_messages m
  INNER JOIN chat_conversations c ON c.id = m.conversation_id
  WHERE m.conversation_id = p_conversation_id
    AND c.session_token = p_session_token
  ORDER BY m.created_at ASC;
$$;

-- Marquer comme lu côté client (vérifie le session_token)
CREATE OR REPLACE FUNCTION mark_chat_read_customer(
  p_session_token uuid,
  p_conversation_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE chat_conversations
  SET unread_customer = 0
  WHERE id = p_conversation_id
    AND session_token = p_session_token;
END;
$$;

-- ============================================
-- 7. Droits d'exécution des RPC pour le rôle anon
-- ============================================

GRANT EXECUTE ON FUNCTION get_my_chat_conversation(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_my_chat_messages(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION mark_chat_read_customer(uuid, uuid) TO anon;

-- Aussi pour authenticated (l'admin pourrait en avoir besoin en debug)
GRANT EXECUTE ON FUNCTION get_my_chat_conversation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_chat_messages(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_chat_read_customer(uuid, uuid) TO authenticated;

-- ============================================
-- 8. RPC d'écriture pour visiteurs (contourne RLS de manière contrôlée)
-- ============================================

-- Créer une conversation (ou retourner celle existante pour le même session+produit)
CREATE OR REPLACE FUNCTION create_chat_conversation(
  p_session_token uuid,
  p_product_id uuid,
  p_product_name text,
  p_product_image text,
  p_customer_name text,
  p_customer_email text
)
RETURNS chat_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv chat_conversations;
  v_name text;
  v_email text;
  v_pname text;
BEGIN
  -- Validation / sanitation basique
  v_name := btrim(regexp_replace(coalesce(p_customer_name, ''), '<[^>]*>', '', 'g'));
  v_email := nullif(btrim(regexp_replace(coalesce(p_customer_email, ''), '<[^>]*>', '', 'g')), '');
  v_pname := btrim(regexp_replace(coalesce(p_product_name, ''), '<[^>]*>', '', 'g'));

  IF char_length(v_name) < 1 OR char_length(v_name) > 100 THEN
    RAISE EXCEPTION 'Nom invalide';
  END IF;
  IF v_email IS NOT NULL AND v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Email invalide';
  END IF;
  IF p_session_token IS NULL THEN
    RAISE EXCEPTION 'session_token requis';
  END IF;
  IF p_product_id IS NULL THEN
    RAISE EXCEPTION 'product_id requis';
  END IF;

  -- Si conversation ouverte existe déjà pour ce session+produit, la retourner
  SELECT * INTO v_conv
  FROM chat_conversations
  WHERE session_token = p_session_token
    AND product_id = p_product_id
    AND status = 'open'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN v_conv;
  END IF;

  -- Rate limit : max 1 nouvelle conversation / minute / session
  IF EXISTS (
    SELECT 1 FROM chat_conversations
    WHERE session_token = p_session_token
      AND created_at > now() - interval '1 minute'
  ) THEN
    RAISE EXCEPTION 'Trop de demandes. Veuillez patienter.';
  END IF;

  INSERT INTO chat_conversations (
    product_id, product_name, product_image,
    customer_name, customer_email, session_token
  )
  VALUES (
    p_product_id, left(v_pname, 200), p_product_image,
    v_name, v_email, p_session_token
  )
  RETURNING * INTO v_conv;

  -- Message système d'ouverture
  INSERT INTO chat_messages (conversation_id, sender_role, content)
  VALUES (v_conv.id, 'system', 'Discussion ouverte pour le produit "' || left(v_pname, 200) || '"');

  RETURN v_conv;
END;
$$;

-- Envoyer un message en tant que visiteur (vérifie le session_token)
CREATE OR REPLACE FUNCTION send_chat_message_customer(
  p_session_token uuid,
  p_conversation_id uuid,
  p_content text
)
RETURNS chat_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg chat_messages;
  v_content text;
  v_exists boolean;
BEGIN
  -- Vérifier que la conversation appartient bien à ce session_token et est ouverte
  SELECT EXISTS(
    SELECT 1 FROM chat_conversations
    WHERE id = p_conversation_id
      AND session_token = p_session_token
      AND status = 'open'
  ) INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'Conversation introuvable ou fermée';
  END IF;

  -- Sanitation basique + validation longueur
  v_content := btrim(regexp_replace(coalesce(p_content, ''), '<[^>]*>', '', 'g'));
  IF char_length(v_content) < 1 OR char_length(v_content) > 5000 THEN
    RAISE EXCEPTION 'Message invalide (longueur 1-5000 caractères)';
  END IF;

  -- Rate limit : max 10 messages / minute / conversation côté customer
  IF (
    SELECT count(*) FROM chat_messages
    WHERE conversation_id = p_conversation_id
      AND sender_role = 'customer'
      AND created_at > now() - interval '1 minute'
  ) >= 10 THEN
    RAISE EXCEPTION 'Trop de messages envoyés. Veuillez patienter.';
  END IF;

  INSERT INTO chat_messages (conversation_id, sender_role, content)
  VALUES (p_conversation_id, 'customer', v_content)
  RETURNING * INTO v_msg;

  RETURN v_msg;
END;
$$;

GRANT EXECUTE ON FUNCTION create_chat_conversation(uuid, uuid, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION send_chat_message_customer(uuid, uuid, text) TO anon, authenticated;
