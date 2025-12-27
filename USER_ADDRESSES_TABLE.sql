-- Script pour créer la table user_addresses
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- ============================================
-- ÉTAPE 1 : Créer la table user_addresses
-- ============================================

CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'Madagascar',
  phone TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_is_default ON user_addresses(is_default);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_user_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS user_addresses_updated_at ON user_addresses;
CREATE TRIGGER user_addresses_updated_at
  BEFORE UPDATE ON user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_user_addresses_updated_at();

-- ============================================
-- ÉTAPE 2 : Politiques RLS (Row Level Security)
-- ============================================

ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs puissent voir leurs propres adresses
CREATE POLICY "Users can view their own addresses" ON user_addresses
  FOR SELECT USING (user_id = auth.uid());

-- Politique pour que les utilisateurs authentifiés puissent voir toutes les adresses (pour l'admin)
CREATE POLICY "Authenticated users can view all addresses" ON user_addresses
  FOR SELECT USING (auth.role() = 'authenticated');

-- Politique pour que les utilisateurs puissent créer leurs propres adresses
CREATE POLICY "Users can create their own addresses" ON user_addresses
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Politique pour que les utilisateurs puissent modifier leurs propres adresses
CREATE POLICY "Users can update their own addresses" ON user_addresses
  FOR UPDATE USING (user_id = auth.uid());

-- Politique pour que les utilisateurs puissent supprimer leurs propres adresses
CREATE POLICY "Users can delete their own addresses" ON user_addresses
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- ÉTAPE 3 : Contrainte pour une seule adresse par défaut par utilisateur
-- ============================================

-- Fonction pour s'assurer qu'il n'y a qu'une seule adresse par défaut par utilisateur
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  -- Si cette adresse est définie comme par défaut
  IF NEW.is_default = TRUE THEN
    -- Désactiver toutes les autres adresses par défaut pour cet utilisateur
    UPDATE user_addresses
    SET is_default = FALSE
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour appliquer la contrainte
DROP TRIGGER IF EXISTS user_addresses_single_default ON user_addresses;
CREATE TRIGGER user_addresses_single_default
  BEFORE INSERT OR UPDATE ON user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_address();

