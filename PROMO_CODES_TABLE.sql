-- Table pour stocker les codes promo
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- ============================================
-- ÉTAPE 1 : Créer la table promo_codes
-- ============================================

CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value DECIMAL(10, 2) NOT NULL,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  usage_limit_per_user INTEGER DEFAULT 1,
  min_order_amount DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promo_codes_valid_dates ON promo_codes(valid_from, valid_until);

-- ============================================
-- ÉTAPE 2 : Créer la table promo_code_usage
-- ============================================

CREATE TABLE IF NOT EXISTS promo_code_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID, -- La contrainte de clé étrangère vers orders sera ajoutée dans UPDATE_ORDERS_TABLE.sql
  used_at TIMESTAMPTZ DEFAULT NOW(),
  discount_amount DECIMAL(10, 2) NOT NULL
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_promo_code_id ON promo_code_usage(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_user_id ON promo_code_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_order_id ON promo_code_usage(order_id);

-- ============================================
-- ÉTAPE 3 : Fonction pour mettre à jour updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_promo_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS promo_codes_updated_at ON promo_codes;
CREATE TRIGGER promo_codes_updated_at
  BEFORE UPDATE ON promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_promo_codes_updated_at();

-- ============================================
-- ÉTAPE 4 : Fonction pour valider un code promo
-- ============================================

CREATE OR REPLACE FUNCTION validate_promo_code(
  p_code TEXT,
  p_user_id UUID,
  p_subtotal DECIMAL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  discount_amount DECIMAL,
  error_message TEXT,
  promo_code_id UUID,
  promo_code_type TEXT,
  promo_code_value DECIMAL
) AS $$
DECLARE
  v_promo_code RECORD;
  v_usage_count INTEGER;
  v_discount DECIMAL;
BEGIN
  -- Récupérer le code promo
  SELECT * INTO v_promo_code
  FROM promo_codes
  WHERE UPPER(code) = UPPER(p_code)
    AND is_active = true;

  -- Vérifier si le code existe
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 'Code promo invalide'::TEXT, NULL::UUID, NULL::TEXT, NULL::DECIMAL;
    RETURN;
  END IF;

  -- Vérifier les dates de validité
  IF v_promo_code.valid_from IS NOT NULL AND NOW() < v_promo_code.valid_from THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 'Ce code promo n''est pas encore valide'::TEXT, v_promo_code.id, NULL::TEXT, NULL::DECIMAL;
    RETURN;
  END IF;

  IF v_promo_code.valid_until IS NOT NULL AND NOW() > v_promo_code.valid_until THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 'Ce code promo a expiré'::TEXT, v_promo_code.id, NULL::TEXT, NULL::DECIMAL;
    RETURN;
  END IF;

  -- Vérifier le montant minimum de commande
  IF v_promo_code.min_order_amount IS NOT NULL AND p_subtotal < v_promo_code.min_order_amount THEN
    RETURN QUERY SELECT false, 0::DECIMAL, 
      format('Montant minimum de commande requis : %s Ar', v_promo_code.min_order_amount)::TEXT, 
      v_promo_code.id, NULL::TEXT, NULL::DECIMAL;
    RETURN;
  END IF;

  -- Vérifier la limite d'utilisation par utilisateur
  IF p_user_id IS NOT NULL AND v_promo_code.usage_limit_per_user > 0 THEN
    SELECT COUNT(*) INTO v_usage_count
    FROM promo_code_usage
    WHERE promo_code_id = v_promo_code.id
      AND user_id = p_user_id;

    IF v_usage_count >= v_promo_code.usage_limit_per_user THEN
      RETURN QUERY SELECT false, 0::DECIMAL, 'Vous avez atteint la limite d''utilisation de ce code promo'::TEXT, v_promo_code.id, NULL::TEXT, NULL::DECIMAL;
      RETURN;
    END IF;
  END IF;

  -- Calculer la réduction
  IF v_promo_code.type = 'percentage' THEN
    v_discount := p_subtotal * (v_promo_code.value / 100);
  ELSE
    v_discount := LEAST(v_promo_code.value, p_subtotal);
  END IF;

  -- Retourner le résultat valide
  RETURN QUERY SELECT 
    true, 
    v_discount, 
    NULL::TEXT, 
    v_promo_code.id, 
    v_promo_code.type, 
    v_promo_code.value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ÉTAPE 5 : Politiques RLS (Row Level Security)
-- ============================================

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usage ENABLE ROW LEVEL SECURITY;

-- Politique pour la lecture publique des codes actifs
CREATE POLICY "Public can read active promo codes" ON promo_codes
  FOR SELECT USING (is_active = true);

-- Politique pour les administrateurs (lecture et écriture)
CREATE POLICY "Authenticated users can manage promo codes" ON promo_codes
  FOR ALL USING (auth.role() = 'authenticated');

-- Politique pour la lecture des statistiques d'utilisation (admins uniquement)
CREATE POLICY "Authenticated users can read promo code usage" ON promo_code_usage
  FOR SELECT USING (auth.role() = 'authenticated');

-- Politique pour l'insertion d'utilisation (publique pour permettre l'utilisation)
CREATE POLICY "Anyone can insert promo code usage" ON promo_code_usage
  FOR INSERT WITH CHECK (true);

-- Politique pour que les utilisateurs puissent voir leurs propres utilisations
CREATE POLICY "Users can read their own promo code usage" ON promo_code_usage
  FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'authenticated');

