import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/ui/Button';
import { formatPrice } from '../utils/formatters';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { SEO } from '../components/seo/SEO';
import { normalizeColors, ColorWithHex } from '../config/colors';

export default function Shop() {
  const { categories } = useCategories();
  const { products } = useProducts();
  const [searchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'all'
  );
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('relevance');
  const searchQuery = searchParams.get('search') || '';
  const filterNew = searchParams.get('filter') === 'new';
  const filterSale = searchParams.get('filter') === 'sale';

  // Prix min/max (pour un futur slider si besoin)
  const allPrices = useMemo(() => products.map((p) => p.salePrice || p.price), [products]);
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 200000;

  // Filtrage des produits
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Recherche
    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Catégorie
    if (selectedCategory !== 'all') {
      const category = categories.find((c) => c.slug === selectedCategory);
      if (category) {
        filtered = filtered.filter((p) => p.category === category.name);
      }
    }

    // Nouveautés
    if (filterNew) {
      filtered = filtered.filter((p) => p.isNew);
    }

    // Soldes
    if (filterSale) {
      filtered = filtered.filter((p) => p.isOnSale);
    }

    // Prix - DÉSACTIVÉ TEMPORAIREMENT POUR TESTER LA FLUIDITÉ
    // filtered = filtered.filter((p) => {
    //   const price = p.salePrice || p.price;
    //   return price >= priceRange[0] && price <= priceRange[1];
    // });

    // Tailles
    if (selectedSizes.length > 0) {
      filtered = filtered.filter((p) =>
        selectedSizes.some((size) => p.sizes.includes(size))
      );
    }

    // Couleurs
    if (selectedColors.length > 0) {
      filtered = filtered.filter((p) => {
        // Gérer les deux formats : string[] ou ColorWithHex[]
        const productColorNames = Array.isArray(p.colors) && p.colors.length > 0
          ? (typeof p.colors[0] === 'string' 
              ? p.colors as string[]
              : (p.colors as Array<{name: string, hex: string}>).map(c => c.name))
          : [];
        return selectedColors.some((color) => productColorNames.includes(color));
      });
    }

    // Tri
    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
        break;
      case 'price-desc':
        filtered.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
        break;
      case 'newest':
        filtered.sort((a, b) => {
          if (a.isNew && !b.isNew) return -1;
          if (!a.isNew && b.isNew) return 1;
          return 0;
        });
        break;
      default:
        break;
    }

    return filtered;
  }, [
    products,
    categories,
    searchQuery,
    selectedCategory,
    filterNew,
    filterSale,
    selectedSizes,
    selectedColors,
    sortBy,
  ]);

  const allSizes = Array.from(new Set(products.flatMap((p) => p.sizes))).sort();
  // Extraire les couleurs avec leur hex (gérer les deux formats : string[] ou ColorWithHex[])
  const allColorsWithHex = useMemo(() => {
    const colorMap = new Map<string, ColorWithHex>();
    products.forEach((p) => {
      if (Array.isArray(p.colors) && p.colors.length > 0) {
        const normalized = normalizeColors(p.colors);
        normalized.forEach((color) => {
          if (!colorMap.has(color.name)) {
            colorMap.set(color.name, color);
          }
        });
      }
    });
    return Array.from(colorMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedSizes([]);
    setSelectedColors([]);
    setSortBy('relevance');
  };


  const FilterSidebar = ({ isVisible = true }: { isVisible?: boolean }) => {
    return (
    <div className="space-y-6">
      {/* Catégories */}
      <div>
        <h3 className="font-heading font-semibold text-lg mb-3 text-text-dark">Catégories</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="category"
              value="all"
              checked={selectedCategory === 'all'}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-primary"
            />
            <span>Toutes</span>
          </label>
          {categories.map((cat) => (
            <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="category"
                value={cat.slug}
                checked={selectedCategory === cat.slug}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-primary"
              />
              <span>{cat.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Tailles */}
      <div>
        <h3 className="font-heading font-semibold text-lg mb-3 text-text-dark">Tailles</h3>
        <div className="flex flex-wrap gap-2">
          {allSizes.map((size) => (
            <button
              key={size}
              onClick={() => toggleSize(size)}
              className={`px-3 py-1 rounded border-2 transition-colors ${
                selectedSizes.includes(size)
                  ? 'border-secondary bg-secondary text-white'
                  : 'border-neutral-support text-text-dark hover:border-primary'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Couleurs */}
      <div>
        <h3 className="font-heading font-semibold text-lg mb-3 text-text-dark">Couleurs</h3>
        <div className="flex flex-wrap gap-2">
          {allColorsWithHex.map((color) => {
            const isWhite = color.hex === '#ecf0f1' || color.hex === '#FFFFFF' || color.hex === '#ffffff' || color.name === 'Blanc';
            return (
              <button
                key={color.name}
                onClick={() => toggleColor(color.name)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  isWhite ? 'border-gray-300' : ''
                } ${
                  selectedColors.includes(color.name)
                    ? 'border-secondary scale-110 ring-2 ring-secondary'
                    : 'border-gray-300 hover:border-primary'
                }`}
                style={{
                  backgroundColor: color.hex,
                }}
                title={color.name}
                aria-label={color.name}
              />
            );
          })}
        </div>
      </div>

      <Button variant="outline" onClick={clearFilters} className="w-full">
        Réinitialiser les filtres
      </Button>
    </div>
    );
  };

  const pageTitle = searchQuery
    ? `Résultats pour "${searchQuery}"`
    : filterNew
    ? 'Nouveautés'
    : filterSale
    ? 'Soldes'
    : 'Boutique';

  const pageDescription = searchQuery
    ? `Découvrez nos produits correspondant à "${searchQuery}"`
    : filterNew
    ? 'Découvrez nos dernières nouveautés de mode féminine'
    : filterSale
    ? 'Profitez de nos soldes et promotions sur une sélection d\'articles'
    : 'Parcourez notre collection complète de mode féminine haut de gamme. Vêtements, accessoires, chaussures et bijoux.';

  return (
    <>
      <SEO
        title={pageTitle}
        description={pageDescription}
        keywords="boutique, produits, mode féminine, vêtements, accessoires, chaussures, bijoux, Madagascar"
        url="/boutique"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: pageTitle,
          description: pageDescription,
          url: 'https://eshopbyvalsue.mg/boutique',
        }}
      />
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
      <div className="mb-6 text-sm text-text-dark/80">
        <span>Accueil</span>
        <span className="mx-2">/</span>
        <span className="text-text-dark font-medium">Boutique</span>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filtres - Desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <FilterSidebar isVisible={true} />
        </aside>

        {/* Zone produits */}
        <div className="flex-1">
          {/* En-tête avec tri et compteur */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-heading font-bold text-text-dark mb-2">
                {searchQuery
                  ? `Résultats pour "${searchQuery}"`
                  : filterNew
                  ? 'Nouveautés'
                  : filterSale
                  ? 'Soldes'
                  : 'Boutique'}
              </h1>
              <p className="text-text-dark/80">
                {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} trouvé
                {filteredProducts.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(true)}
                className="lg:hidden px-4 py-2 border-2 border-neutral-support rounded-lg hover:border-primary transition-colors"
              >
                Filtres
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
              >
                <option value="relevance">Pertinence</option>
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
                <option value="newest">Nouveautés</option>
              </select>
            </div>
          </div>

          {/* Grille produits */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-xl text-text-dark/80 mb-4">
                Aucun produit trouvé avec ces critères.
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal filtres mobile */}
      {showFilters && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setShowFilters(false)}>
          <div
            className="absolute right-0 top-0 h-full w-80 bg-white p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-heading font-semibold text-text-dark">Filtres</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="text-text-dark hover:text-secondary"
              >
                ✕
              </button>
            </div>
            <FilterSidebar isVisible={showFilters} />
          </div>
        </div>
      )}
    </div>
    </>
  );
}

