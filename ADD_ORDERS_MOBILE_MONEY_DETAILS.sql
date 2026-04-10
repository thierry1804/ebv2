-- Colonnes pour l’opérateur Mobile Money et la référence de transaction (checkout).
-- À exécuter dans l’éditeur SQL Supabase si les colonnes n’existent pas encore.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS mobile_money_operator TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mobile_money_payment_reference TEXT;

COMMENT ON COLUMN orders.mobile_money_operator IS 'mvola | orange | airtel';
COMMENT ON COLUMN orders.mobile_money_payment_reference IS 'Référence communiquée par le client après paiement';
