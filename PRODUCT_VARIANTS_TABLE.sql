-- ============================================
-- SYSTÈME DE VARIANTES DE PRODUITS AVANCÉ
-- ============================================
-- Ce script crée les tables nécessaires pour gérer les variantes de produits
-- avec stock, prix et attributs individuels par combinaison.
--
-- Exécutez ce script dans l'éditeur SQL de Supabase.
-- ============================================

-- ============================================
-- ÉTAPE 1 : Ajouter la colonne has_variants à products
-- ============================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false;

-- ============================================
-- ÉTAPE 2 : Table des options de variantes
-- ============================================
-- Ex: "Taille", "Couleur", "Matière"

CREATE TABLE IF NOT EXISTS variant_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_variant_options_product ON variant_options(product_id);
CREATE INDEX IF NOT EXISTS idx_variant_options_position ON variant_options(product_id, position);

-- ============================================
-- ÉTAPE 3 : Table des valeurs d'options
-- ============================================
-- Ex: "S", "M", "L" pour Taille ou "Rouge", "Bleu" pour Couleur

CREATE TABLE IF NOT EXISTS variant_option_values (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  option_id UUID NOT NULL REFERENCES variant_options(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  hex_color TEXT, -- Code hex si c'est une couleur (ex: #E74C3C)
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_variant_option_values_option ON variant_option_values(option_id);
CREATE INDEX IF NOT EXISTS idx_variant_option_values_position ON variant_option_values(option_id, position);

-- ============================================
-- ÉTAPE 4 : Table des variantes de produit
-- ============================================
-- Chaque variante représente une combinaison unique (ex: T-Shirt S Rouge)

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT, -- Code article unique
  barcode TEXT, -- Code-barres EAN/UPC (optionnel)
  price DECIMAL(10, 2), -- Prix spécifique (NULL = utiliser prix du produit)
  compare_at_price DECIMAL(10, 2), -- Prix barré (optionnel)
  cost_price DECIMAL(10, 2), -- Prix d'achat (pour calcul marge)
  stock INTEGER DEFAULT 0,
  weight DECIMAL(8, 2), -- Poids en grammes (pour livraison)
  is_available BOOLEAN DEFAULT true,
  image_url TEXT, -- Image spécifique à la variante
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_available ON product_variants(product_id, is_available);
CREATE INDEX IF NOT EXISTS idx_product_variants_position ON product_variants(product_id, position);

-- Contrainte d'unicité sur SKU (si non null)
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_sku_unique;
ALTER TABLE product_variants ADD CONSTRAINT product_variants_sku_unique UNIQUE (sku);

-- ============================================
-- ÉTAPE 5 : Table de liaison variante <-> valeurs d'options
-- ============================================
-- Permet d'associer une variante à ses valeurs d'options

CREATE TABLE IF NOT EXISTS product_variant_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  option_value_id UUID NOT NULL REFERENCES variant_option_values(id) ON DELETE CASCADE,
  UNIQUE(variant_id, option_value_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_product_variant_options_variant ON product_variant_options(variant_id);
CREATE INDEX IF NOT EXISTS idx_product_variant_options_value ON product_variant_options(option_value_id);

-- ============================================
-- ÉTAPE 6 : Trigger pour updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_product_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS product_variants_updated_at ON product_variants;
CREATE TRIGGER product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_product_variants_updated_at();

-- ============================================
-- ÉTAPE 7 : Fonction pour calculer le stock total d'un produit
-- ============================================

CREATE OR REPLACE FUNCTION get_product_total_stock(p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total INTEGER;
  product_has_variants BOOLEAN;
BEGIN
  -- Vérifier si le produit a des variantes
  SELECT has_variants INTO product_has_variants
  FROM products
  WHERE id = p_product_id;
  
  -- Si pas de variantes, retourner le stock du produit
  IF NOT COALESCE(product_has_variants, false) THEN
    SELECT stock INTO total FROM products WHERE id = p_product_id;
    RETURN COALESCE(total, 0);
  END IF;
  
  -- Sinon, calculer la somme des stocks des variantes disponibles
  SELECT COALESCE(SUM(stock), 0) INTO total
  FROM product_variants
  WHERE product_id = p_product_id AND is_available = true;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ÉTAPE 8 : Fonction pour obtenir la plage de prix d'un produit
-- ============================================

CREATE OR REPLACE FUNCTION get_product_price_range(p_product_id UUID)
RETURNS TABLE(min_price DECIMAL, max_price DECIMAL) AS $$
DECLARE
  base_price DECIMAL;
  product_has_variants BOOLEAN;
BEGIN
  -- Récupérer les infos du produit
  SELECT price, has_variants INTO base_price, product_has_variants
  FROM products
  WHERE id = p_product_id;
  
  -- Si pas de variantes, retourner le prix de base
  IF NOT COALESCE(product_has_variants, false) THEN
    RETURN QUERY SELECT base_price, base_price;
    RETURN;
  END IF;
  
  -- Sinon, calculer la plage de prix des variantes
  RETURN QUERY
  SELECT 
    COALESCE(MIN(COALESCE(pv.price, base_price)), base_price),
    COALESCE(MAX(COALESCE(pv.price, base_price)), base_price)
  FROM product_variants pv
  WHERE pv.product_id = p_product_id AND pv.is_available = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ÉTAPE 9 : Fonction pour trouver une variante par options
-- ============================================

CREATE OR REPLACE FUNCTION find_variant_by_options(
  p_product_id UUID,
  p_option_values UUID[]
)
RETURNS UUID AS $$
DECLARE
  variant_id UUID;
  option_count INTEGER;
BEGIN
  -- Compter le nombre d'options attendues
  option_count := array_length(p_option_values, 1);
  
  IF option_count IS NULL OR option_count = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Trouver la variante qui a exactement ces options
  SELECT pv.id INTO variant_id
  FROM product_variants pv
  WHERE pv.product_id = p_product_id
    AND pv.is_available = true
    AND (
      SELECT COUNT(*)
      FROM product_variant_options pvo
      WHERE pvo.variant_id = pv.id
        AND pvo.option_value_id = ANY(p_option_values)
    ) = option_count
    AND (
      SELECT COUNT(*)
      FROM product_variant_options pvo
      WHERE pvo.variant_id = pv.id
    ) = option_count
  LIMIT 1;
  
  RETURN variant_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ÉTAPE 10 : RLS Policies (Row Level Security)
-- ============================================

-- Activer RLS
ALTER TABLE variant_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_options ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Lecture publique variant_options" ON variant_options;
DROP POLICY IF EXISTS "Admin write variant_options" ON variant_options;
DROP POLICY IF EXISTS "Lecture publique variant_option_values" ON variant_option_values;
DROP POLICY IF EXISTS "Admin write variant_option_values" ON variant_option_values;
DROP POLICY IF EXISTS "Lecture publique product_variants" ON product_variants;
DROP POLICY IF EXISTS "Admin write product_variants" ON product_variants;
DROP POLICY IF EXISTS "Lecture publique product_variant_options" ON product_variant_options;
DROP POLICY IF EXISTS "Admin write product_variant_options" ON product_variant_options;

-- Lecture publique pour tous
CREATE POLICY "Lecture publique variant_options" 
  ON variant_options FOR SELECT 
  USING (true);

CREATE POLICY "Lecture publique variant_option_values" 
  ON variant_option_values FOR SELECT 
  USING (true);

CREATE POLICY "Lecture publique product_variants" 
  ON product_variants FOR SELECT 
  USING (true);

CREATE POLICY "Lecture publique product_variant_options" 
  ON product_variant_options FOR SELECT 
  USING (true);

-- Écriture pour utilisateurs authentifiés (admins)
CREATE POLICY "Admin write variant_options" 
  ON variant_options FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin write variant_option_values" 
  ON variant_option_values FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin write product_variants" 
  ON product_variants FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin write product_variant_options" 
  ON product_variant_options FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- ÉTAPE 11 : Vue pour faciliter les requêtes
-- ============================================

CREATE OR REPLACE VIEW product_variants_with_options AS
SELECT 
  pv.id AS variant_id,
  pv.product_id,
  pv.sku,
  pv.barcode,
  pv.price AS variant_price,
  pv.compare_at_price,
  pv.cost_price,
  pv.stock,
  pv.weight,
  pv.is_available,
  pv.image_url,
  pv.position,
  p.name AS product_name,
  p.price AS base_price,
  COALESCE(pv.price, p.price) AS effective_price,
  json_agg(
    json_build_object(
      'option_id', vo.id,
      'option_name', vo.name,
      'value_id', vov.id,
      'value', vov.value,
      'hex_color', vov.hex_color
    ) ORDER BY vo.position
  ) AS options
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
LEFT JOIN product_variant_options pvo ON pvo.variant_id = pv.id
LEFT JOIN variant_option_values vov ON vov.id = pvo.option_value_id
LEFT JOIN variant_options vo ON vo.id = vov.option_id
GROUP BY pv.id, pv.product_id, pv.sku, pv.barcode, pv.price, 
         pv.compare_at_price, pv.cost_price, pv.stock, pv.weight,
         pv.is_available, pv.image_url, pv.position, p.name, p.price;

-- ============================================
-- FIN DU SCRIPT
-- ============================================
-- N'oubliez pas d'exécuter ce script dans Supabase !
