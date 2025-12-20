-- Table pour stocker les catégories de produits
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS categories_updated_at ON categories;
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_categories_updated_at();

-- Politiques RLS (Row Level Security)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Politique pour la lecture publique (tous les utilisateurs peuvent lire les catégories actives)
CREATE POLICY "Public can read active categories" ON categories
  FOR SELECT USING (is_active = true);

-- Politique pour les administrateurs (lecture et écriture)
-- Option 1: Pour le développement - tous les utilisateurs authentifiés
CREATE POLICY "Authenticated users can manage categories" ON categories
  FOR ALL USING (auth.role() = 'authenticated');

-- Option 2: Pour la production - uniquement les administrateurs
-- Remplacez 'admin@byvalsue.com' par votre email administrateur
-- CREATE POLICY "Admins can manage categories" ON categories
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM auth.users
--       WHERE auth.users.id = auth.uid()
--       AND auth.users.email = 'admin@byvalsue.com'
--     )
--   );

-- Données initiales par défaut
INSERT INTO categories (name, slug, image, description, display_order, is_active) VALUES
('Vêtements', 'vetements', 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', 'Collection de vêtements élégants et tendance', 1, true),
('Accessoires', 'accessoires', 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400', 'Accessoires de mode pour compléter votre style', 2, true),
('Chaussures', 'chaussures', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400', 'Chaussures confortables et stylées', 3, true),
('Sacs', 'sacs', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400', 'Sacs à main et accessoires de maroquinerie', 4, true),
('Bijoux', 'bijoux', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400', 'Bijoux élégants et raffinés', 5, true),
('Soldes', 'soldes', 'https://images.unsplash.com/photo-1594633312682-6ea69c1dcc64?w=400', 'Articles en promotion', 6, true)
ON CONFLICT (slug) DO NOTHING;

