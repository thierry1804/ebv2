# Configuration SEO et Google Analytics

Ce document explique comment le SEO et Google Analytics sont configurés dans le projet.

## 🎯 SEO (Search Engine Optimization)

### Composant SEO

Le composant `SEO` (`src/components/seo/SEO.tsx`) permet de gérer dynamiquement les meta tags pour chaque page :

- **Meta tags de base** : title, description, keywords
- **Open Graph** : Pour le partage sur Facebook, LinkedIn, etc.
- **Twitter Cards** : Pour le partage sur Twitter
- **Canonical URL** : Pour éviter le contenu dupliqué
- **Données structurées JSON-LD** : Pour améliorer l'affichage dans les résultats de recherche

### Utilisation

```tsx
import { SEO } from '../components/seo/SEO';

export default function MyPage() {
  return (
    <>
      <SEO
        title="Titre de la page"
        description="Description de la page"
        keywords="mot-clé1, mot-clé2"
        url="/ma-page"
        type="website" // ou "article", "product"
        image="/image-og.jpg"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          // ...
        }}
      />
      {/* Contenu de la page */}
    </>
  );
}
```

### Pages avec SEO configuré

✅ **Toutes les pages principales** ont le SEO configuré :
- Page d'accueil (`/`)
- Boutique (`/boutique`)
- Détail produit (`/produit/:id`)
- Blog (`/blog`)
- Détail article (`/blog/:id`)
- À propos (`/a-propos`)
- Contact (`/contact`)

### Données structurées (Schema.org)

Les données structurées sont automatiquement ajoutées pour :

- **Produits** : Schema.org Product avec prix, disponibilité, avis
- **Articles de blog** : Schema.org BlogPosting avec auteur, date de publication
- **Pages** : Schema.org WebPage, AboutPage, ContactPage, etc.

### Fichiers SEO statiques

- **`public/robots.txt`** : Indique aux robots des moteurs de recherche quelles pages indexer
- **`public/sitemap.xml`** : Plan du site pour aider les moteurs de recherche à découvrir toutes les pages

> **Note** : Le sitemap.xml actuel contient les pages statiques. Pour un site dynamique, vous devriez générer le sitemap automatiquement avec toutes les URLs de produits et d'articles.

## 📊 Google Analytics (GA4)

### Configuration

1. **Obtenez votre ID de mesure GA4** :
   - Allez sur [Google Analytics](https://analytics.google.com)
   - Créez une propriété GA4
   - Copiez l'ID de mesure (format: `G-XXXXXXXXXX`)

2. **Ajoutez l'ID dans `.env`** :
   ```env
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

3. **Redémarrez le serveur de développement**

### Fonctionnalités

Le hook `useGoogleAnalytics` (`src/hooks/useGoogleAnalytics.ts`) :

- ✅ Charge automatiquement le script Google Analytics
- ✅ Suit les changements de page (navigation SPA)
- ✅ Fournit des fonctions utilitaires pour les événements e-commerce

### Événements e-commerce suivis

Les événements suivants sont automatiquement trackés :

- **`view_item`** : Vue d'un produit (page détail produit)
- **`add_to_cart`** : Ajout d'un produit au panier
- **`begin_checkout`** : Début du processus de checkout
- **`purchase`** : Achat complété
- **`search`** : Recherche de produits
- **`select_item`** : Sélection d'un produit

### Utilisation manuelle

```tsx
import { analytics } from '../hooks/useGoogleAnalytics';

// Suivre un événement personnalisé
analytics.addToCart(productId, productName, price, quantity);

// Événement personnalisé
import { trackEvent } from '../hooks/useGoogleAnalytics';
trackEvent('custom_event', {
  category: 'engagement',
  action: 'click',
  label: 'button_name',
});
```

### Vérification

1. Ouvrez votre site en mode développement
2. Ouvrez les outils de développement (F12)
3. Allez dans l'onglet "Network"
4. Filtrez par "gtag" ou "analytics"
5. Vous devriez voir les requêtes vers Google Analytics

## 🔍 Vérification du SEO

### Outils de test

- **Google Search Console** : [search.google.com/search-console](https://search.google.com/search-console)
- **Google Rich Results Test** : [search.google.com/test/rich-results](https://search.google.com/test/rich-results)
- **Facebook Sharing Debugger** : [developers.facebook.com/tools/debug](https://developers.facebook.com/tools/debug)
- **Twitter Card Validator** : [cards-dev.twitter.com/validator](https://cards-dev.twitter.com/validator)

### Checklist SEO

- [x] Meta tags title et description sur toutes les pages
- [x] Open Graph tags pour le partage social
- [x] Twitter Cards
- [x] Canonical URLs
- [x] Données structurées JSON-LD
- [x] robots.txt configuré
- [x] sitemap.xml créé
- [x] Images avec attributs alt
- [x] URLs propres et descriptives
- [x] Contenu optimisé pour les mots-clés

## 📝 Notes importantes

1. **Sitemap dynamique** : Pour un site avec beaucoup de produits/articles, générez le sitemap dynamiquement
2. **Images OG** : Ajoutez des images Open Graph optimisées (1200x630px recommandé)
3. **Performance** : Le SEO ne doit pas impacter les performances. Les scripts sont chargés de manière asynchrone
4. **Privacy** : Google Analytics respecte les paramètres de confidentialité. Vous pouvez ajouter un banner de consentement si nécessaire (RGPD)

