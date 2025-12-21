-- Script pour générer des avis de test pour tous les produits
-- Exécutez ce script dans l'éditeur SQL de Supabase
-- Génère entre 10 et 100 avis par produit avec un mix positif, neutre et négatif

-- ============================================
-- ÉTAPE 1 : Créer une fonction pour générer des avis aléatoires
-- ============================================

CREATE OR REPLACE FUNCTION generate_random_reviews()
RETURNS void AS $$
DECLARE
  product_record RECORD;
  review_count INTEGER;
  i INTEGER;
  rating_val INTEGER;
  comment_text TEXT;
  user_name TEXT;
  days_ago INTEGER;
  review_date TIMESTAMPTZ;
  -- Noms malgaches
  first_names TEXT[] := ARRAY[
    'Andry', 'Rakoto', 'Rasoa', 'Nirina', 'Hery', 'Voahangy', 'Fidy', 'Lala', 'Mamy', 'Hanta',
    'Tiana', 'Fara', 'Sitraka', 'Miora', 'Tahiry', 'Faniry', 'Hasina', 'Aina', 'Miarisoa', 'Nomena',
    'Rija', 'Tsiry', 'Feno', 'Miarintsoa', 'Tahina', 'Fanja', 'Lova', 'Miaramanjaka', 'Rivo', 'Soa',
    'Manjaka', 'Razafy', 'Razafindrakoto', 'Rakotomalala', 'Randrianarisoa', 'Razafindratsima', 'Rakotondrabe',
    'Razafindramboa', 'Rakotondrasoa', 'Razafindrakoto', 'Rakotondrazaka', 'Razafindramanga', 'Rakotondraibe',
    'Razafindrakotona', 'Rakotondraza', 'Razafindrakotovao', 'Rakotondrazafy', 'Razafindrakotona', 'Rakotondrazaka'
  ];
  last_names TEXT[] := ARRAY[
    'Rakoto', 'Rasoa', 'Randrianarisoa', 'Razafindrakoto', 'Rakotomalala', 'Razafindratsima', 'Rakotondrabe',
    'Razafindramboa', 'Rakotondrasoa', 'Razafindrakoto', 'Rakotondrazaka', 'Razafindramanga', 'Rakotondraibe',
    'Razafindrakotona', 'Rakotondraza', 'Razafindrakotovao', 'Rakotondrazafy', 'Razafindrakotona', 'Rakotondrazaka',
    'Razafindrakotona', 'Rakotondrazaka', 'Razafindrakotona', 'Rakotondrazaka', 'Razafindrakotona', 'Rakotondrazaka'
  ];
  -- Commentaires positifs
  positive_comments TEXT[] := ARRAY[
    'Produit de très bonne qualité, je recommande vivement !',
    'Excellent produit, conforme à la description. Livraison rapide.',
    'Très satisfaite de mon achat, la qualité est au rendez-vous.',
    'Produit magnifique, je suis ravie ! Qualité premium.',
    'Superbe qualité, je recommande sans hésitation.',
    'Produit parfait, exactement comme sur les photos.',
    'Très belle qualité, je suis très contente de mon achat.',
    'Excellent rapport qualité-prix, je recommande !',
    'Produit de qualité supérieure, très satisfaite.',
    'Magnifique produit, la qualité dépasse mes attentes.',
    'Très bon produit, je suis enchantée !',
    'Qualité exceptionnelle, je recommande vivement.',
    'Produit parfait, conforme à mes attentes.',
    'Excellente qualité, je suis très satisfaite.',
    'Super produit, je vais certainement racheter.'
  ];
  -- Commentaires neutres
  neutral_comments TEXT[] := ARRAY[
    'Produit correct, rien de spécial mais fait le travail.',
    'Qualité moyenne, acceptable pour le prix.',
    'Produit correct sans plus, correspond à mes attentes basiques.',
    'Assez bien, mais pourrait être mieux.',
    'Correct, ni excellent ni mauvais.',
    'Produit acceptable, qualité moyenne.',
    'Pas mal, mais il y a mieux ailleurs.',
    'Correct pour le prix, rien d''exceptionnel.',
    'Produit moyen, fait l''affaire.',
    'Qualité correcte, sans plus.'
  ];
  -- Commentaires négatifs
  negative_comments TEXT[] := ARRAY[
    'Déçu par la qualité, ne correspond pas à la description.',
    'Qualité décevante pour le prix demandé.',
    'Produit de mauvaise qualité, je ne recommande pas.',
    'Très déçu, la qualité n''est pas à la hauteur.',
    'Produit décevant, ne vaut pas le prix.',
    'Qualité médiocre, je ne recommande pas.',
    'Déçu par ce produit, ne correspond pas aux attentes.',
    'Qualité insuffisante pour le prix.',
    'Produit de mauvaise qualité, très déçu.',
    'Ne recommande pas, qualité décevante.'
  ];
BEGIN
  -- Parcourir tous les produits
  FOR product_record IN SELECT id FROM products LOOP
    -- Générer un nombre aléatoire d'avis entre 10 et 100
    review_count := 10 + floor(random() * 91)::INTEGER;
    
    -- Générer les avis
    FOR i IN 1..review_count LOOP
      -- Générer un nom d'utilisateur malgache
      user_name := first_names[1 + floor(random() * array_length(first_names, 1))::INTEGER] || ' ' ||
                   last_names[1 + floor(random() * array_length(last_names, 1))::INTEGER];
      
      -- Générer une note avec distribution :
      -- 60% positif (4-5), 20% neutre (3), 20% négatif (1-2)
      IF random() < 0.6 THEN
        -- Positif
        rating_val := 4 + floor(random() * 2)::INTEGER;
        comment_text := positive_comments[1 + floor(random() * array_length(positive_comments, 1))::INTEGER];
      ELSIF random() < 0.8 THEN
        -- Neutre
        rating_val := 3;
        comment_text := neutral_comments[1 + floor(random() * array_length(neutral_comments, 1))::INTEGER];
      ELSE
        -- Négatif
        rating_val := 1 + floor(random() * 2)::INTEGER;
        comment_text := negative_comments[1 + floor(random() * array_length(negative_comments, 1))::INTEGER];
      END IF;
      
      -- Générer une date aléatoire dans les 6 derniers mois
      days_ago := floor(random() * 180)::INTEGER;
      review_date := NOW() - (days_ago || ' days')::INTERVAL;
      
      -- Insérer l'avis
      INSERT INTO reviews (product_id, user_name, rating, comment, images, created_at)
      VALUES (
        product_record.id,
        user_name,
        rating_val,
        comment_text,
        '{}',
        review_date
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ÉTAPE 2 : Exécuter la fonction pour générer les avis
-- ============================================

-- ATTENTION : Cette fonction peut prendre du temps si vous avez beaucoup de produits
-- Les triggers mettront automatiquement à jour les notes des produits

SELECT generate_random_reviews();

-- ============================================
-- ÉTAPE 3 : Vérifier les résultats
-- ============================================

-- Voir le nombre d'avis par produit
SELECT 
  p.name,
  p.id,
  COUNT(r.id) as review_count,
  ROUND(AVG(r.rating)::numeric, 1) as avg_rating
FROM products p
LEFT JOIN reviews r ON p.id = r.product_id
GROUP BY p.id, p.name
ORDER BY review_count DESC;

-- Voir la distribution des notes
SELECT 
  rating,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM reviews), 1) as percentage
FROM reviews
GROUP BY rating
ORDER BY rating;

-- Supprimer la fonction après utilisation (optionnel)
-- DROP FUNCTION IF EXISTS generate_random_reviews();

