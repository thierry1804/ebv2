-- Script pour corriger les politiques RLS de la table user_profiles
-- Ce script permet aux utilisateurs authentifiés (admins) de voir tous les profils utilisateurs
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- ============================================
-- ÉTAPE 1 : Vérifier que la table existe
-- ============================================

-- Si la table n'existe pas, créez-la d'abord avec ce script :
/*
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Créer un trigger pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
*/

-- ============================================
-- ÉTAPE 2 : Activer RLS sur user_profiles
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 3 : Supprimer les anciennes politiques (si elles existent)
-- ============================================

DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;

-- ============================================
-- ÉTAPE 4 : Créer les nouvelles politiques
-- ============================================

-- Politique 1 : Les utilisateurs peuvent lire leur propre profil
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Politique 2 : Tous les utilisateurs authentifiés peuvent lire tous les profils
-- (Nécessaire pour que les admins puissent voir tous les utilisateurs)
CREATE POLICY "Authenticated users can read all profiles" ON user_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Politique 3 : Les utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Politique 4 : Les utilisateurs authentifiés peuvent créer des profils
-- (Pour la création automatique via trigger)
CREATE POLICY "Authenticated users can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- ÉTAPE 5 : Vérifier les politiques créées
-- ============================================

-- Exécutez cette requête pour voir toutes les politiques actives :
-- SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- ============================================
-- NOTE IMPORTANTE
-- ============================================
-- Si vous voulez restreindre l'accès aux admins uniquement, utilisez plutôt :
/*
-- Créer une fonction pour vérifier si l'utilisateur est admin
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

-- Supprimer la politique "Authenticated users can read all profiles"
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON user_profiles;

-- Créer une politique pour les admins uniquement
CREATE POLICY "Admins can read all profiles" ON user_profiles
  FOR SELECT USING (is_admin());
*/

