-- ============================================
-- MIGRATION : Support de plusieurs images par variante
-- ============================================
-- Ce script remplace le champ image_url (une seule image) 
-- par images[] (tableau d'images) dans la table product_variants
--
-- Exécutez ce script dans l'éditeur SQL de Supabase.
-- ============================================

-- ============================================
-- ÉTAPE 1 : Ajouter la nouvelle colonne images
-- ============================================

ALTER TABLE product_variants 
  ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- ============================================
-- ÉTAPE 2 : Migrer les données existantes (si image_url existe)
-- ============================================
-- Si des variantes ont déjà une image_url, la convertir en tableau
-- Cette étape ne s'exécute que si la colonne image_url existe

DO $$
BEGIN
  -- Vérifier si la colonne image_url existe
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'product_variants' 
    AND column_name = 'image_url'
  ) THEN
    -- Migrer les données de image_url vers images[]
    UPDATE product_variants
    SET images = CASE 
      WHEN image_url IS NOT NULL AND image_url != '' THEN ARRAY[image_url]
      ELSE '{}'::TEXT[]
    END
    WHERE images = '{}' OR images IS NULL;
    
    RAISE NOTICE 'Migration des données de image_url vers images[] terminée';
  ELSE
    RAISE NOTICE 'La colonne image_url n''existe pas. Aucune migration nécessaire.';
  END IF;
END $$;

-- ============================================
-- ÉTAPE 3 : Supprimer l'ancienne colonne image_url
-- ============================================
-- ATTENTION : Décommentez cette ligne seulement après avoir vérifié
-- que la migration s'est bien passée et que les images sont dans images[]

-- ALTER TABLE product_variants DROP COLUMN IF EXISTS image_url;

-- ============================================
-- ÉTAPE 4 : Mettre à jour la vue si elle existe
-- ============================================

DROP VIEW IF EXISTS product_variants_with_options;

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
  pv.images, -- Utilise maintenant images[] au lieu de image_url
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
         pv.is_available, pv.images, pv.position, p.name, p.price;

-- ============================================
-- FIN DU SCRIPT
-- ============================================
-- Après avoir exécuté ce script et vérifié que tout fonctionne,
-- vous pouvez décommenter l'étape 3 pour supprimer image_url
