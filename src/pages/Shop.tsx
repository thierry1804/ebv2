import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/ui/Button';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { SEO } from '../components/seo/SEO';
import { normalizeColors, ColorWithHex } from '../config/colors';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

export default function Shop() {
  const { categories } = useCategories();
  const { products } = useProducts();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'all'
  );
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('relevance');
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;
  const searchQuery = searchParams.get('search') || '';
  const filterNew = searchParams.get('filter') === 'new';
  const filterSale = searchParams.get('filter') === 'sale';

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

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedSizes, selectedColors, filterNew, filterSale, searchQuery, sortBy]);

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
    toast.success('Filtres réinitialisés');
  };

  const hasActiveFilters = selectedCategory !== 'all' || selectedSizes.length > 0 || selectedColors.length > 0 || filterNew || filterSale;


  const FilterSidebar = () => {
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
      <nav className="mb-6 text-sm text-text-dark/80" aria-label="Fil d'Ariane">
        <Link to="/" className="hover:text-secondary transition-colors">
          Accueil
        </Link>
        <span className="mx-2">/</span>
        <span className="text-text-dark font-medium">Boutique</span>
      </nav>

      <div className="flex gap-8">
        {/* Sidebar filtres - Desktop */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <FilterSidebar />
        </aside>

        {/* Zone produits */}
        <div className="flex-1">
          {/* En-tête avec tri et compteur */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex-1">
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
              
              {/* Filtres actifs */}
              {hasActiveFilters && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {filterNew && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm font-medium">
                      Nouveautés
                      <button
                        onClick={() => navigate('/boutique')}
                        className="ml-1 hover:bg-secondary/20 rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-secondary"
                        aria-label="Retirer le filtre nouveautés"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  )}
                  {filterSale && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm font-medium">
                      Soldes
                      <button
                        onClick={() => navigate('/boutique')}
                        className="ml-1 hover:bg-secondary/20 rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-secondary"
                        aria-label="Retirer le filtre soldes"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  )}
                  {selectedCategory !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm font-medium">
                      {categories.find(c => c.slug === selectedCategory)?.name || selectedCategory}
                      <button
                        onClick={() => setSelectedCategory('all')}
                        className="ml-1 hover:bg-secondary/20 rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-secondary"
                        aria-label="Retirer le filtre catégorie"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  )}
                  {selectedSizes.map(size => (
                    <span key={size} className="inline-flex items-center gap-1 px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm font-medium">
                      Taille: {size}
                      <button
                        onClick={() => toggleSize(size)}
                        className="ml-1 hover:bg-secondary/20 rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-secondary"
                        aria-label={`Retirer le filtre taille ${size}`}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                  {selectedColors.map(color => (
                    <span key={color} className="inline-flex items-center gap-1 px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm font-medium">
                      Couleur: {color}
                      <button
                        onClick={() => toggleColor(color)}
                        className="ml-1 hover:bg-secondary/20 rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-secondary"
                        aria-label={`Retirer le filtre couleur ${color}`}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(true)}
                className="lg:hidden px-4 py-2 border-2 border-neutral-support rounded-lg hover:border-primary transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
                aria-label="Ouvrir les filtres"
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
          {paginatedProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border-2 border-neutral-support rounded-lg hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
                    aria-label="Page précédente"
                  >
                    Précédent
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-4 py-2 rounded-lg border-2 transition-colors min-w-[44px] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 ${
                            currentPage === pageNum
                              ? 'border-secondary bg-secondary text-white'
                              : 'border-neutral-support text-text-dark hover:border-primary'
                          }`}
                          aria-label={`Page ${pageNum}`}
                          aria-current={currentPage === pageNum ? 'page' : undefined}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border-2 border-neutral-support rounded-lg hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
                    aria-label="Page suivante"
                  >
                    Suivant
                  </button>
                </div>
              )}
            </>
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
      <div 
        className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowFilters(false)}
        role="dialog"
        aria-modal="true"
        aria-label="Filtres de recherche"
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        <div
          className={`absolute right-0 top-0 h-full w-80 bg-white p-6 overflow-y-auto shadow-2xl transform transition-transform duration-300 ease-out ${
            showFilters ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-heading font-semibold text-text-dark">Filtres</h2>
            <button
              onClick={() => setShowFilters(false)}
              className="text-text-dark hover:text-secondary p-2 rounded-lg hover:bg-primary/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
              aria-label="Fermer les filtres"
            >
              ✕
            </button>
          </div>
          <FilterSidebar />
        </div>
      </div>
    </div>
    </>
  );
}

