-- Script pour ajouter la fonctionnalité "applicable à postériori" aux codes promo
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- ============================================
-- ÉTAPE 1 : Ajouter la colonne is_post_application à promo_codes
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'promo_codes' AND column_name = 'is_post_application'
  ) THEN
    ALTER TABLE promo_codes 
    ADD COLUMN is_post_application BOOLEAN DEFAULT false NOT NULL;
    
    COMMENT ON COLUMN promo_codes.is_post_application IS 
    'Si true, la réduction n''est pas appliquée au checkout mais peut être remboursée ultérieurement';
  END IF;
END $$;

-- ============================================
-- ÉTAPE 2 : Créer la table promo_code_refunds
-- ============================================

CREATE TABLE IF NOT EXISTS promo_code_refunds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  refund_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processed', 'cancelled')) DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_promo_code_refunds_order_id ON promo_code_refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_refunds_promo_code_id ON promo_code_refunds(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_refunds_user_id ON promo_code_refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_refunds_status ON promo_code_refunds(status);

-- ============================================
-- ÉTAPE 3 : Trigger pour mettre à jour updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_promo_code_refunds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS promo_code_refunds_updated_at ON promo_code_refunds;
CREATE TRIGGER promo_code_refunds_updated_at
  BEFORE UPDATE ON promo_code_refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_promo_code_refunds_updated_at();

-- ============================================
-- ÉTAPE 4 : Politiques RLS (Row Level Security)
-- ============================================

ALTER TABLE promo_code_refunds ENABLE ROW LEVEL SECURITY;

-- Politique pour les administrateurs (lecture et écriture complètes)
CREATE POLICY "Authenticated users can manage promo code refunds" ON promo_code_refunds
  FOR ALL USING (auth.role() = 'authenticated');

-- Politique pour que les utilisateurs puissent voir leurs propres remboursements
CREATE POLICY "Users can view their own promo code refunds" ON promo_code_refunds
  FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'authenticated');
