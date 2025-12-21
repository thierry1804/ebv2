-- Table pour stocker les avis des produits
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- ============================================
-- ÉTAPE 1 : Créer la table reviews
-- ============================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- ============================================
-- ÉTAPE 2 : Fonction pour mettre à jour updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS reviews_updated_at ON reviews;
CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- ============================================
-- ÉTAPE 3 : Fonction pour recalculer la note moyenne et le nombre d'avis
-- ============================================

CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(2, 1);
  total_reviews INTEGER;
BEGIN
  -- Calculer la moyenne et le nombre total d'avis pour le produit
  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0),
    COUNT(*)
  INTO avg_rating, total_reviews
  FROM reviews
  WHERE product_id = COALESCE(NEW.product_id, OLD.product_id);

  -- Mettre à jour la table products
  UPDATE products
  SET 
    rating = avg_rating,
    review_count = total_reviews,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ÉTAPE 4 : Triggers pour mettre à jour automatiquement les notes
-- ============================================

-- Trigger après INSERT
DROP TRIGGER IF EXISTS reviews_after_insert ON reviews;
CREATE TRIGGER reviews_after_insert
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_product_rating();

-- Trigger après UPDATE
DROP TRIGGER IF EXISTS reviews_after_update ON reviews;
CREATE TRIGGER reviews_after_update
  AFTER UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_product_rating();

-- Trigger après DELETE
DROP TRIGGER IF EXISTS reviews_after_delete ON reviews;
CREATE TRIGGER reviews_after_delete
  AFTER DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_product_rating();

-- ============================================
-- ÉTAPE 5 : Activer Row Level Security (RLS)
-- ============================================

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ÉTAPE 6 : Politiques RLS
-- ============================================

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Public can read reviews" ON reviews;
DROP POLICY IF EXISTS "Public can insert reviews" ON reviews;
DROP POLICY IF EXISTS "Public can update reviews" ON reviews;
DROP POLICY IF EXISTS "Public can delete reviews" ON reviews;

-- Lecture publique (tous les utilisateurs peuvent lire les avis)
CREATE POLICY "Public can read reviews" ON reviews
  FOR SELECT USING (true);

-- Insertion publique (tous les utilisateurs peuvent créer des avis)
CREATE POLICY "Public can insert reviews" ON reviews
  FOR INSERT WITH CHECK (true);

-- Mise à jour publique (tous les utilisateurs peuvent modifier leurs avis)
-- Note: En production, vous pourriez vouloir limiter cela
CREATE POLICY "Public can update reviews" ON reviews
  FOR UPDATE USING (true) WITH CHECK (true);

-- Suppression publique (tous les utilisateurs peuvent supprimer des avis)
-- Note: En production, vous pourriez vouloir limiter cela
CREATE POLICY "Public can delete reviews" ON reviews
  FOR DELETE USING (true);

-- ============================================
-- Vérification : Lister les politiques créées
-- ============================================

SELECT 
  policyname, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'reviews'
ORDER BY policyname;

