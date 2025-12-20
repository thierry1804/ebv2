-- Script pour corriger les politiques RLS de la table products
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- ============================================
-- ÉTAPE 1 : Supprimer toutes les politiques existantes pour products
-- ============================================

DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;
DROP POLICY IF EXISTS "Public can read products" ON products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON products;

-- ============================================
-- ÉTAPE 2 : S'assurer que RLS est activé
-- ============================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 3 : Créer les nouvelles politiques
-- ============================================

-- Politique pour la lecture publique (tous les utilisateurs peuvent lire)
CREATE POLICY "Public can read products" ON products
  FOR SELECT USING (true);

-- Politique unique pour tous les utilisateurs authentifiés (INSERT, UPDATE, DELETE)
-- IMPORTANT : WITH CHECK est nécessaire pour permettre INSERT
CREATE POLICY "Authenticated users can manage products" ON products
  FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- Vérification : Lister les politiques créées
-- ============================================

SELECT 
  policyname, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'products'
ORDER BY policyname;

