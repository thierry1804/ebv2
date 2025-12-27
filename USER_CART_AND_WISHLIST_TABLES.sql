-- Script pour créer les tables user_cart et user_wishlist
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- ============================================
-- ÉTAPE 1 : Créer la table user_cart
-- ============================================

CREATE TABLE IF NOT EXISTS user_cart (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_cart_user_id ON user_cart(user_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_user_cart_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS user_cart_updated_at ON user_cart;
CREATE TRIGGER user_cart_updated_at
  BEFORE UPDATE ON user_cart
  FOR EACH ROW
  EXECUTE FUNCTION update_user_cart_updated_at();

-- ============================================
-- ÉTAPE 2 : Créer la table user_wishlist
-- ============================================

CREATE TABLE IF NOT EXISTS user_wishlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_wishlist_user_id ON user_wishlist(user_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_user_wishlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS user_wishlist_updated_at ON user_wishlist;
CREATE TRIGGER user_wishlist_updated_at
  BEFORE UPDATE ON user_wishlist
  FOR EACH ROW
  EXECUTE FUNCTION update_user_wishlist_updated_at();

-- ============================================
-- ÉTAPE 3 : Politiques RLS (Row Level Security)
-- ============================================

-- Activer RLS sur user_cart
ALTER TABLE user_cart ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs puissent voir leur propre panier
CREATE POLICY "Users can view their own cart" ON user_cart
  FOR SELECT USING (user_id = auth.uid());

-- Politique pour que les utilisateurs puissent créer leur propre panier
CREATE POLICY "Users can create their own cart" ON user_cart
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Politique pour que les utilisateurs puissent modifier leur propre panier
CREATE POLICY "Users can update their own cart" ON user_cart
  FOR UPDATE USING (user_id = auth.uid());

-- Politique pour que les utilisateurs puissent supprimer leur propre panier
CREATE POLICY "Users can delete their own cart" ON user_cart
  FOR DELETE USING (user_id = auth.uid());

-- Activer RLS sur user_wishlist
ALTER TABLE user_wishlist ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs puissent voir leur propre wishlist
CREATE POLICY "Users can view their own wishlist" ON user_wishlist
  FOR SELECT USING (user_id = auth.uid());

-- Politique pour que les utilisateurs puissent créer leur propre wishlist
CREATE POLICY "Users can create their own wishlist" ON user_wishlist
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Politique pour que les utilisateurs puissent modifier leur propre wishlist
CREATE POLICY "Users can update their own wishlist" ON user_wishlist
  FOR UPDATE USING (user_id = auth.uid());

-- Politique pour que les utilisateurs puissent supprimer leur propre wishlist
CREATE POLICY "Users can delete their own wishlist" ON user_wishlist
  FOR DELETE USING (user_id = auth.uid());

