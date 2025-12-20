-- Script pour corriger les politiques RLS existantes
-- Exécutez ce script dans l'éditeur SQL de Supabase si vous avez des erreurs "policy already exists"

-- ============================================
-- ÉTAPE 1 : Supprimer toutes les politiques existantes
-- ============================================

-- Supprimer les politiques de blog_posts
DROP POLICY IF EXISTS "Admins can manage posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can manage posts" ON blog_posts;
DROP POLICY IF EXISTS "Public can read published posts" ON blog_posts;

-- Supprimer les politiques de products
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;
DROP POLICY IF EXISTS "Public can read products" ON products;

-- Supprimer les politiques de user_profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;

-- Supprimer les politiques de site_content
DROP POLICY IF EXISTS "Admins can manage content" ON site_content;
DROP POLICY IF EXISTS "Authenticated users can manage content" ON site_content;
DROP POLICY IF EXISTS "Public can read content" ON site_content;

-- Supprimer les politiques de orders
DROP POLICY IF EXISTS "Admins can read all orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can read all orders" ON orders;
DROP POLICY IF EXISTS "Users can read own orders" ON orders;

-- ============================================
-- ÉTAPE 2 : Activer RLS sur toutes les tables
-- ============================================

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 3 : Créer les nouvelles politiques
-- Choisissez l'option A (développement) ou B (production)
-- ============================================

-- ============================================
-- OPTION A : Politiques pour le développement
-- (Tous les utilisateurs authentifiés peuvent tout gérer)
-- ============================================

-- Politiques pour blog_posts
CREATE POLICY "Public can read published posts" ON blog_posts
  FOR SELECT USING (is_published = true);

CREATE POLICY "Authenticated users can manage posts" ON blog_posts
  FOR ALL USING (auth.role() = 'authenticated');

-- Politiques pour products
CREATE POLICY "Public can read products" ON products
  FOR SELECT USING (true);

-- IMPORTANT : Utilisez WITH CHECK pour permettre INSERT
CREATE POLICY "Authenticated users can manage products" ON products
  FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Politiques pour user_profiles
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Authenticated users can read all profiles" ON user_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Politiques pour site_content
CREATE POLICY "Public can read content" ON site_content
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage content" ON site_content
  FOR ALL USING (auth.role() = 'authenticated');

-- Politiques pour orders
CREATE POLICY "Users can read own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can read all orders" ON orders
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- OPTION B : Politiques pour la production
-- (Seuls les admins peuvent gérer, basé sur l'email)
-- ============================================
-- Décommentez cette section si vous préférez l'Option B
-- et commentez l'Option A ci-dessus

/*
-- Créer la fonction helper pour vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'admin@eshopbyvalsue.com' -- Remplacez par votre email admin
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Politiques restrictives pour les admins
CREATE POLICY "Admins can manage posts" ON blog_posts
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can read all profiles" ON user_profiles
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can manage content" ON site_content
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can read all orders" ON orders
  FOR SELECT USING (is_admin());

-- Politiques de lecture publique (nécessaires pour le site public)
CREATE POLICY "Public can read published posts" ON blog_posts
  FOR SELECT USING (is_published = true);

CREATE POLICY "Public can read products" ON products
  FOR SELECT USING (true);

CREATE POLICY "Public can read content" ON site_content
  FOR SELECT USING (true);

CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can read own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);
*/

