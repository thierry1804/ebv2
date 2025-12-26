-- Script pour créer/mettre à jour la table orders avec les champs pour les codes promo
-- Exécutez ce script dans l'éditeur SQL de Supabase
--
-- IMPORTANT : Exécutez d'abord PROMO_CODES_TABLE.sql avant ce script
-- car la table orders fait référence à promo_codes

-- ============================================
-- ÉTAPE 1 : Créer la table orders si elle n'existe pas
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
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

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- ============================================
-- ÉTAPE 2 : Ajouter les colonnes promo_code_id et promo_discount
-- ============================================

-- Vérifier si les colonnes existent déjà avant de les ajouter
DO $$ 
BEGIN
  -- Ajouter promo_code_id si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'promo_code_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_promo_code_id ON orders(promo_code_id);
  END IF;

  -- Ajouter promo_discount si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'promo_discount'
  ) THEN
    ALTER TABLE orders ADD COLUMN promo_discount DECIMAL(10, 2) DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- ÉTAPE 3 : Politiques RLS (Row Level Security)
-- ============================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs puissent voir leurs propres commandes
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'authenticated');

-- Politique pour que les utilisateurs puissent créer leurs propres commandes
CREATE POLICY "Users can create their own orders" ON orders
  FOR INSERT WITH CHECK (user_id = auth.uid() OR auth.role() = 'authenticated');

-- Politique pour que les admins puissent gérer toutes les commandes
CREATE POLICY "Authenticated users can manage orders" ON orders
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- ÉTAPE 4 : Ajouter la contrainte de clé étrangère order_id dans promo_code_usage
-- ============================================

-- Ajouter la contrainte de clé étrangère vers orders si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'promo_code_usage_order_id_fkey'
    AND table_name = 'promo_code_usage'
  ) THEN
    ALTER TABLE promo_code_usage 
    ADD CONSTRAINT promo_code_usage_order_id_fkey 
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- ÉTAPE 5 : Mettre à jour les commandes existantes (optionnel)
-- ============================================

-- Si vous avez des commandes existantes, vous pouvez les mettre à jour ici
-- UPDATE orders SET promo_discount = 0 WHERE promo_discount IS NULL;

