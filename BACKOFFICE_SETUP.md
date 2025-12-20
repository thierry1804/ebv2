# Configuration du Backoffice

Ce document explique comment configurer et utiliser le backoffice de ByValsue.

## 🚀 Configuration Supabase

### 1. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Notez votre URL de projet et votre clé anonyme (anon key)

### 2. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet avec :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anon
```

### 3. Créer les tables dans Supabase

Exécutez les requêtes SQL suivantes dans l'éditeur SQL de Supabase :

#### Table `blog_posts` (Articles)

```sql
CREATE TABLE blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  image TEXT,
  author TEXT NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX idx_blog_posts_published ON blog_posts(is_published, published_at);
CREATE INDEX idx_blog_posts_category ON blog_posts(category);
```

#### Table `products` (Produits)

```sql
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  composition TEXT,
  stock INTEGER DEFAULT 0,
  sizes TEXT[] DEFAULT '{}',
  colors TEXT[] DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  is_new BOOLEAN DEFAULT false,
  is_on_sale BOOLEAN DEFAULT false,
  sale_price DECIMAL(10, 2),
  brand TEXT,
  rating DECIMAL(2, 1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_stock ON products(stock);
```

#### Table `user_profiles` (Profils utilisateurs)

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fonction pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, first_name, last_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer le profil automatiquement
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### Table `site_content` (Contenu du site)

```sql
CREATE TABLE site_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'html', 'json')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Index pour améliorer les recherches
CREATE INDEX idx_site_content_key ON site_content(key);
```

#### Table `orders` (Commandes - optionnel)

```sql
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  order_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  subtotal DECIMAL(10, 2) NOT NULL,
  shipping DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT,
  shipping_address JSONB,
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
```

### 4. Configurer les politiques de sécurité (RLS)

Activez Row Level Security (RLS) sur toutes les tables et créez les politiques appropriées :

**⚠️ IMPORTANT :** Pour le développement, vous pouvez temporairement désactiver RLS ou utiliser des politiques permissives. En production, utilisez des politiques plus restrictives.

**💡 Solution rapide :** Si vous obtenez des erreurs "policy already exists", utilisez le fichier `FIX_RLS_POLICIES.sql` à la racine du projet. Ce script supprime toutes les politiques existantes et les recrée proprement.

#### Vérifier les politiques existantes

Si vous avez déjà créé des politiques et que vous obtenez une erreur "policy already exists", vous pouvez d'abord lister toutes les politiques existantes :

```sql
-- Lister toutes les politiques pour une table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('blog_posts', 'products', 'user_profiles', 'site_content', 'orders')
ORDER BY tablename, policyname;
```

Ou supprimez toutes les politiques d'une table spécifique :

```sql
-- Exemple : Supprimer toutes les politiques de blog_posts
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'blog_posts') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON blog_posts';
    END LOOP;
END $$;
```

#### Option 1 : Politiques simples pour le développement (tous les utilisateurs authentifiés)

```sql
-- ⚠️ IMPORTANT : Supprimez d'abord les politiques existantes si vous en avez déjà créé
-- Cela évite les erreurs "policy already exists"
DROP POLICY IF EXISTS "Admins can manage posts" ON blog_posts;
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage content" ON site_content;
DROP POLICY IF EXISTS "Admins can read all orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can manage posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can manage content" ON site_content;
DROP POLICY IF EXISTS "Authenticated users can read all orders" ON orders;

-- Activer RLS sur toutes les tables
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Politiques pour blog_posts
-- Lecture publique des articles publiés
CREATE POLICY "Public can read published posts" ON blog_posts
  FOR SELECT USING (is_published = true);

-- Tous les utilisateurs authentifiés peuvent gérer les articles
CREATE POLICY "Authenticated users can manage posts" ON blog_posts
  FOR ALL USING (auth.role() = 'authenticated');

-- Politiques pour products
-- Lecture publique
CREATE POLICY "Public can read products" ON products
  FOR SELECT USING (true);

-- Tous les utilisateurs authentifiés peuvent gérer les produits
-- IMPORTANT : Utilisez FOR ALL avec USING et WITH CHECK pour permettre INSERT, UPDATE, DELETE
CREATE POLICY "Authenticated users can manage products" ON products
  FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Politiques pour user_profiles
-- Les utilisateurs peuvent lire leur propre profil
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Tous les utilisateurs authentifiés peuvent lire tous les profils (pour le backoffice)
CREATE POLICY "Authenticated users can read all profiles" ON user_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Politiques pour site_content
-- Lecture publique
CREATE POLICY "Public can read content" ON site_content
  FOR SELECT USING (true);

-- Tous les utilisateurs authentifiés peuvent gérer le contenu
CREATE POLICY "Authenticated users can manage content" ON site_content
  FOR ALL USING (auth.role() = 'authenticated');

-- Politiques pour orders
-- Les utilisateurs peuvent lire leurs propres commandes
CREATE POLICY "Users can read own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Tous les utilisateurs authentifiés peuvent lire toutes les commandes (pour le backoffice)
CREATE POLICY "Authenticated users can read all orders" ON orders
  FOR SELECT USING (auth.role() = 'authenticated');
```

#### Option 2 : Politiques restrictives pour la production (basées sur l'email)

Si vous préférez restreindre l'accès à certains administrateurs uniquement :

```sql
-- ⚠️ IMPORTANT : Supprimez d'abord TOUTES les politiques existantes pour éviter les conflits
-- Supprimez les politiques de l'Option 1 si elles existent
DROP POLICY IF EXISTS "Authenticated users can manage posts" ON blog_posts;
DROP POLICY IF EXISTS "Public can read published posts" ON blog_posts;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;
DROP POLICY IF EXISTS "Public can read products" ON products;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can manage content" ON site_content;
DROP POLICY IF EXISTS "Public can read content" ON site_content;
DROP POLICY IF EXISTS "Authenticated users can read all orders" ON orders;
DROP POLICY IF EXISTS "Users can read own orders" ON orders;

-- Supprimez aussi les anciennes politiques admin si elles existent
DROP POLICY IF EXISTS "Admins can manage posts" ON blog_posts;
DROP POLICY IF EXISTS "Admins can manage products" ON products;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage content" ON site_content;
DROP POLICY IF EXISTS "Admins can read all orders" ON orders;

-- Créez une fonction helper pour vérifier si l'utilisateur est admin
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
```

**Note :** Pour le développement et les tests, utilisez l'Option 1. Pour la production, utilisez l'Option 2 avec votre email administrateur.

## 🔐 Créer un compte administrateur

1. Dans Supabase, allez dans **Authentication** > **Users**
2. Cliquez sur **Add user** > **Create new user**
3. Entrez l'email et le mot de passe de l'administrateur
4. Si vous utilisez l'Option 2 des politiques RLS, assurez-vous que cet email correspond à celui utilisé dans la fonction `is_admin()`

**Alternative :** Vous pouvez aussi créer un utilisateur directement depuis l'interface de connexion du backoffice en vous inscrivant, puis en modifiant manuellement les permissions dans Supabase si nécessaire.

## 📱 Accéder au backoffice

1. Lancez l'application : `npm run dev`
2. Allez sur `/admin/login`
3. Connectez-vous avec les identifiants de l'administrateur

## 🎯 Fonctionnalités du backoffice

### Dashboard
- Vue d'ensemble avec statistiques (utilisateurs, articles, produits, commandes)

### Articles
- Créer, modifier, supprimer des articles de blog
- Publier/dépublier des articles
- Gérer les catégories et tags

### Produits
- Gérer le catalogue de produits
- Ajouter/modifier les informations produits
- Gérer le stock et les prix

### Utilisateurs
- Consulter la liste des utilisateurs
- Voir les informations des comptes

### Contenu du site
- Gérer le contenu statique du site
- Modifier les textes, HTML ou JSON
- Système de clés pour référencer le contenu dans le code

## 🔧 Personnalisation

### Modifier l'email admin dans les politiques

Remplacez `'admin@byvalsue.com'` dans toutes les politiques RLS par votre email administrateur, ou créez une table `admin_users` pour gérer les rôles de manière plus flexible.

### Ajouter de nouvelles fonctionnalités

Le backoffice est extensible. Vous pouvez ajouter :
- Gestion des commandes
- Gestion des catégories
- Statistiques avancées
- Export de données
- Gestion des médias/images

## 📝 Notes importantes

- Les tables doivent être créées dans l'ordre indiqué
- Les politiques RLS sont importantes pour la sécurité
- Pensez à sauvegarder régulièrement votre base de données
- Testez les permissions avant de déployer en production

