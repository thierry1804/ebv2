# Eshop ByValsue

Site e-commerce complet pour **ByValsue**, une boutique en ligne malgache de mode féminine haut de gamme.

## 🎨 Design

Le site utilise une palette de couleurs élégante et féminine :
- **Primaire** : Rose poudré `#E6A1B0`
- **Secondaire** : Vieux rose `#B85C6A`
- **Accent** : Bleu turquoise clair `#8CCED6`
- **Neutre clair** : Blanc cassé `#F5F3EF`
- **Neutre soutien** : Gris rosé `#D6C1C3`
- **Texte** : Gris très foncé `#2B2B2B`

## 🛠️ Technologies

- **React 18** avec TypeScript
- **Vite** pour le build
- **Tailwind CSS** pour le styling
- **React Router DOM** pour le routing
- **Framer Motion** pour les animations
- **React Hot Toast** pour les notifications
- **Lucide React** pour les icônes
- **React Helmet Async** pour le SEO
- **Google Analytics (GA4)** pour le suivi des visiteurs

## 📦 Installation

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditez .env et ajoutez vos clés API

# Lancer le serveur de développement
npm run dev

# Build pour la production
npm run build

# Prévisualiser le build
npm run preview
```

### Configuration des variables d'environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# Supabase (requis)
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anon

# EmailJS (optionnel)
VITE_EMAILJS_SERVICE_ID=votre_service_id
VITE_EMAILJS_TEMPLATE_ID=votre_template_id
VITE_EMAILJS_PUBLIC_KEY=votre_cle_publique

# Google Analytics (optionnel mais recommandé)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Pour obtenir votre ID Google Analytics :**
1. Allez sur [Google Analytics](https://analytics.google.com)
2. Créez une propriété GA4
3. Copiez l'ID de mesure (format: `G-XXXXXXXXXX`)
4. Ajoutez-le dans votre fichier `.env`

## 🚀 Fonctionnalités

### Pages principales
- ✅ Page d'accueil avec hero slider, catégories, nouvelles arrivées, best sellers
- ✅ Page boutique avec filtres avancés (catégories, prix, tailles, couleurs)
- ✅ Page produit détaillée avec galerie, sélecteurs, onglets
- ✅ Page panier avec résumé de commande
- ✅ Checkout en 3 étapes (livraison, paiement, confirmation)
- ✅ Espace utilisateur (profil, commandes, adresses, wishlist)
- ✅ Pages additionnelles (Blog, À propos, Contact, Pages légales)

### Fonctionnalités techniques
- ✅ Gestion du panier avec localStorage
- ✅ Wishlist avec localStorage
- ✅ Authentification simulée
- ✅ Recherche de produits
- ✅ Filtres en temps réel
- ✅ Responsive design mobile-first
- ✅ Animations subtiles avec Framer Motion
- ✅ Notifications toast
- ✅ Formatage de la devise Ariary (MGA)
- ✅ **SEO optimisé** : Meta tags dynamiques, Open Graph, Twitter Cards, données structurées JSON-LD
- ✅ **Google Analytics (GA4)** : Suivi des pages, événements e-commerce (vues produits, ajouts au panier, achats)

## 📁 Structure du projet

```
src/
├── components/       # Composants réutilisables
│   ├── layout/      # Header, Footer, Layout
│   ├── product/     # ProductCard, ProductGallery, etc.
│   ├── seo/         # Composant SEO réutilisable
│   ├── analytics/    # Google Analytics wrapper
│   └── ui/          # Button, Modal, Badge, etc.
├── pages/           # Pages principales
├── context/         # Context API (Cart, Wishlist, Auth)
├── hooks/           # Hooks personnalisés (useGoogleAnalytics, etc.)
├── types/           # Interfaces TypeScript
├── data/            # Données produits simulées
└── utils/           # Helpers et formatters
public/
├── robots.txt       # Configuration pour les robots des moteurs de recherche
└── sitemap.xml      # Plan du site pour le référencement
```

## 🎯 Prochaines étapes

Pour connecter à un backend réel :
1. Remplacer les données simulées par des appels API
2. Implémenter l'authentification réelle
3. Ajouter la gestion des commandes
4. Intégrer un système de paiement
5. Ajouter la gestion des images (upload, optimisation)

## 📝 Notes

- Les données produits sont simulées (30 produits fictifs)
- L'authentification est simulée (pas de backend)
- Les images utilisent Unsplash pour les produits fictifs
- Le panier et la wishlist sont persistés dans localStorage

## 🌐 Déploiement

Le site est prêt pour être déployé sur :
- Vercel
- Netlify
- GitHub Pages
- Tout autre service de hosting statique

```bash
npm run build
# Le dossier dist/ contient les fichiers à déployer
```

