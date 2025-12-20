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

## 📦 Installation

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build pour la production
npm run build

# Prévisualiser le build
npm run preview
```

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

## 📁 Structure du projet

```
src/
├── components/       # Composants réutilisables
│   ├── layout/      # Header, Footer, Layout
│   ├── product/     # ProductCard, ProductGallery, etc.
│   └── ui/          # Button, Modal, Badge, etc.
├── pages/           # Pages principales
├── context/         # Context API (Cart, Wishlist, Auth)
├── types/           # Interfaces TypeScript
├── data/            # Données produits simulées
└── utils/           # Helpers et formatters
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

