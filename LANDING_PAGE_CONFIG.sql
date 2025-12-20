-- Table pour stocker les configurations de la landing page
CREATE TABLE IF NOT EXISTS landing_page_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  section_name TEXT NOT NULL,
  config_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_landing_page_config_section ON landing_page_config(section_key);
CREATE INDEX IF NOT EXISTS idx_landing_page_config_active ON landing_page_config(is_active);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_landing_page_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER landing_page_config_updated_at
  BEFORE UPDATE ON landing_page_config
  FOR EACH ROW
  EXECUTE FUNCTION update_landing_page_config_updated_at();

-- Politiques RLS (Row Level Security)
ALTER TABLE landing_page_config ENABLE ROW LEVEL SECURITY;

-- Politique pour la lecture publique (tous les utilisateurs peuvent lire)
CREATE POLICY "Public can read landing page config" ON landing_page_config
  FOR SELECT USING (is_active = true);

-- Politique pour les administrateurs (lecture et écriture)
-- Option 1: Pour le développement - tous les utilisateurs authentifiés
CREATE POLICY "Authenticated users can manage landing page config" ON landing_page_config
  FOR ALL USING (auth.role() = 'authenticated');

-- Option 2: Pour la production - uniquement les administrateurs
-- Remplacez 'admin@byvalsue.com' par votre email administrateur
-- CREATE POLICY "Admins can manage landing page config" ON landing_page_config
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM auth.users
--       WHERE auth.users.id = auth.uid()
--       AND auth.users.email = 'admin@byvalsue.com'
--     )
--   );

-- Données initiales par défaut
INSERT INTO landing_page_config (section_key, section_name, config_data, is_active) VALUES
-- Configuration du header
('header.logo', 'Logo du site', '{"text": "ByValsue", "imageUrl": null, "link": "/"}'::jsonb, true),
('header.promotional_banner', 'Bannière promotionnelle', '{"text": "Livraison gratuite à partir de 200 000 Ar • Retours gratuits", "isVisible": true}'::jsonb, true),

-- Configuration du hero slider
('hero.slider', 'Hero Slider', '{
  "slides": [
    {
      "title": "Nouvelle Collection Printemps",
      "subtitle": "Découvrez nos dernières créations",
      "image": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200",
      "link": "/boutique?filter=new",
      "buttonText": "Découvrir",
      "isActive": true
    },
    {
      "title": "Soldes d''Été",
      "subtitle": "Jusqu''à -50% sur une sélection d''articles",
      "image": "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200",
      "link": "/boutique?filter=sale",
      "buttonText": "Découvrir",
      "isActive": true
    },
    {
      "title": "Mode Féminine Premium",
      "subtitle": "Élégance et sophistication",
      "image": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200",
      "link": "/boutique",
      "buttonText": "Découvrir",
      "isActive": true
    }
  ],
  "autoplay": true,
  "autoplayInterval": 5000
}'::jsonb, true),

-- Configuration des catégories
('categories', 'Section Catégories', '{
  "title": "Nos Catégories",
  "isVisible": true
}'::jsonb, true),

-- Configuration des nouvelles arrivées
('new_arrivals', 'Section Nouvelles Arrivées', '{
  "title": "Nouvelles Arrivées",
  "seeAllLink": "/boutique?filter=new",
  "seeAllText": "Voir tout",
  "isVisible": true
}'::jsonb, true),

-- Configuration des best sellers
('best_sellers', 'Section Best Sellers', '{
  "title": "Best Sellers",
  "seeAllLink": "/boutique",
  "seeAllText": "Voir tout",
  "isVisible": true
}'::jsonb, true),

-- Configuration des soldes
('sales', 'Section Soldes', '{
  "title": "Soldes",
  "seeAllLink": "/boutique?filter=sale",
  "seeAllText": "Voir tout",
  "isVisible": true
}'::jsonb, true),

-- Configuration Instagram
('instagram', 'Section Instagram', '{
  "title": "Suivez-nous sur Instagram",
  "isVisible": true,
  "posts": [
    {"image": "https://images.unsplash.com/photo-1500000000000?w=400", "link": "#"},
    {"image": "https://images.unsplash.com/photo-1500000000001?w=400", "link": "#"},
    {"image": "https://images.unsplash.com/photo-1500000000002?w=400", "link": "#"},
    {"image": "https://images.unsplash.com/photo-1500000000003?w=400", "link": "#"},
    {"image": "https://images.unsplash.com/photo-1500000000004?w=400", "link": "#"},
    {"image": "https://images.unsplash.com/photo-1500000000005?w=400", "link": "#"}
  ]
}'::jsonb, true),

-- Configuration Newsletter
('newsletter', 'Section Newsletter', '{
  "title": "Restez informée de nos nouveautés",
  "description": "Inscrivez-vous à notre newsletter pour recevoir nos offres exclusives et être la première informée de nos nouvelles collections.",
  "placeholder": "Votre adresse email",
  "buttonText": "S''abonner",
  "isVisible": true
}'::jsonb, true)
ON CONFLICT (section_key) DO NOTHING;

