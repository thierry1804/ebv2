-- Script pour ajouter le champ application_scope aux codes promo
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- ============================================
-- ÉTAPE 1 : Ajouter la colonne application_scope
-- ============================================

-- Vérifier si la colonne existe déjà avant de l'ajouter
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'promo_codes' 
    AND column_name = 'application_scope'
  ) THEN
    ALTER TABLE promo_codes 
    ADD COLUMN application_scope TEXT NOT NULL DEFAULT 'total' 
    CHECK (application_scope IN ('item', 'total'));
  END IF;
END $$;

-- Mettre à jour les codes promo existants pour qu'ils s'appliquent sur le total par défaut
UPDATE promo_codes 
SET application_scope = 'total' 
WHERE application_scope IS NULL;

-- ============================================
-- ÉTAPE 2 : Mettre à jour la fonction de validation
-- ============================================

CREATE OR REPLACE FUNCTION validate_promo_code(
  p_code TEXT,
  p_user_id UUID,
  p_subtotal DECIMAL,
  p_items JSONB DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  discount_amount DECIMAL,
  error_message TEXT,
  promo_code_id UUID,
  promo_code_type TEXT,
  promo_code_value DECIMAL,
  application_scope TEXT
) AS $$
DECLARE
  v_promo_code RECORD;
  v_usage_count INTEGER;
  v_discount DECIMAL;
  v_item_total DECIMAL;
BEGIN
  -- Récupérer le code promo
  SELECT * INTO v_promo_code
  FROM promo_codes
  WHERE UPPER(code) = UPPER(p_code)
    AND is_active = true;

  -- Vérifier si le code existe
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 'Code promo invalide'::TEXT, NULL::UUID, NULL::TEXT, NULL::DECIMAL, NULL::TEXT;
    RETURN;
  END IF;

  -- Vérifier les dates de validité
  IF v_promo_code.valid_from IS NOT NULL AND NOW() < v_promo_code.valid_from THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 'Ce code promo n''est pas encore valide'::TEXT, v_promo_code.id, NULL::TEXT, NULL::DECIMAL, NULL::TEXT;
    RETURN;
  END IF;

  IF v_promo_code.valid_until IS NOT NULL AND NOW() > v_promo_code.valid_until THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 'Ce code promo a expiré'::TEXT, v_promo_code.id, NULL::TEXT, NULL::DECIMAL, NULL::TEXT;
    RETURN;
  END IF;

  -- Vérifier le montant minimum de commande
  IF v_promo_code.min_order_amount IS NOT NULL AND p_subtotal < v_promo_code.min_order_amount THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 
      format('Montant minimum de commande requis : %s Ar', v_promo_code.min_order_amount)::TEXT, 
      v_promo_code.id, NULL::TEXT, NULL::DECIMAL, NULL::TEXT;
    RETURN;
  END IF;

  -- Vérifier la limite d'utilisation par utilisateur
  IF p_user_id IS NOT NULL AND v_promo_code.usage_limit_per_user > 0 THEN
    SELECT COUNT(*) INTO v_usage_count
    FROM promo_code_usage
    WHERE promo_code_id = v_promo_code.id
      AND user_id = p_user_id;

    IF v_usage_count >= v_promo_code.usage_limit_per_user THEN
      RETURN QUERY SELECT false, 0::DECIMAL, 'Vous avez atteint la limite d''utilisation de ce code promo'::TEXT, v_promo_code.id, NULL::TEXT, NULL::DECIMAL, NULL::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Calculer la réduction selon le scope d'application
  IF v_promo_code.application_scope = 'item' THEN
    -- Application par article : calculer sur chaque article
    -- Pour l'instant, on calcule sur le total des articles (peut être affiné plus tard)
    IF v_promo_code.type = 'percentage' THEN
      v_discount := p_subtotal * (v_promo_code.value / 100);
    ELSE
      -- Pour un montant fixe par article, on multiplie par le nombre d'articles
      -- On suppose que p_items contient les articles avec leurs quantités
      IF p_items IS NOT NULL THEN
        -- Calculer le nombre total d'articles
        SELECT COALESCE(SUM((item->>'quantity')::INTEGER), 1) INTO v_item_total
        FROM jsonb_array_elements(p_items) AS item;
        
        v_discount := LEAST(v_promo_code.value * v_item_total, p_subtotal);
      ELSE
        v_discount := LEAST(v_promo_code.value, p_subtotal);
      END IF;
    END IF;
  ELSE
    -- Application sur le total
    IF v_promo_code.type = 'percentage' THEN
      v_discount := p_subtotal * (v_promo_code.value / 100);
    ELSE
      v_discount := LEAST(v_promo_code.value, p_subtotal);
    END IF;
  END IF;

  -- Retourner le résultat valide
  RETURN QUERY SELECT 
    true, 
    v_discount, 
    NULL::TEXT, 
    v_promo_code.id, 
    v_promo_code.type, 
    v_promo_code.value,
    v_promo_code.application_scope;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

