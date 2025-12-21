-- Script pour corriger les politiques RLS de blog_posts
-- Ce script permet aux utilisateurs authentifiés de créer, modifier et supprimer des articles

-- ============================================
-- ÉTAPE 1 : Supprimer les politiques existantes
-- ============================================

DROP POLICY IF EXISTS "Admins can manage posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can manage posts" ON blog_posts;
DROP POLICY IF EXISTS "Public can read published posts" ON blog_posts;

-- ============================================
-- ÉTAPE 2 : S'assurer que RLS est activé
-- ============================================

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 3 : Créer les nouvelles politiques avec WITH CHECK
-- ============================================

-- Politique pour la lecture publique des articles publiés
CREATE POLICY "Public can read published posts" ON blog_posts
  FOR SELECT 
  USING (is_published = true);

-- Politique pour permettre aux utilisateurs authentifiés de gérer les articles
-- IMPORTANT : WITH CHECK est nécessaire pour permettre INSERT et UPDATE
CREATE POLICY "Authenticated users can manage posts" ON blog_posts
  FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- Vérification
-- ============================================
-- Après avoir exécuté ce script, vous devriez pouvoir créer des articles
-- depuis l'interface d'administration

