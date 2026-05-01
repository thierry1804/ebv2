-- ============================================
-- Tailles par variante (ex. variantes « par photo »)
-- ============================================
-- Colonne TEXT[] sur product_variants, alignée sur `colors`.
-- À exécuter dans l’éditeur SQL Supabase.
-- ============================================

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS sizes TEXT[] DEFAULT '{}';

COMMENT ON COLUMN product_variants.sizes IS 'Tailles disponibles pour cette variante (ex: S, M, L). Vide = héritage / non utilisé.';
