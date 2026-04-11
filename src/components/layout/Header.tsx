import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, Heart, ShoppingCart, Menu, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { HeaderLogoConfig, PromotionalBannerConfig } from '../../types';
import { useCategories } from '../../hooks/useCategories';
import { useProducts } from '../../hooks/useProducts';
import { sortCategoriesByProductCount } from '../../lib/sortCategoriesByProductCount';
import { buildFirstProductImageByCategoryName } from '../../lib/firstProductImageByCategory';
import { normalizeImageApiUrl } from '../../lib/imageApi';

/** Vignette méga-menu : image catégorie, sinon 1re image du 1er produit, sinon fond neutre. */
function MegaMenuCategoryImage({
  categoryName,
  categoryImageUrl,
  fallbackProductImageUrl,
}: {
  categoryName: string;
  categoryImageUrl?: string;
  fallbackProductImageUrl?: string;
}) {
  const cat = categoryImageUrl?.trim() || undefined;
  const initial = cat && cat.length > 0 ? cat : fallbackProductImageUrl ?? null;
  const [displaySrc, setDisplaySrc] = useState<string | null>(initial);

  useEffect(() => {
    const c = categoryImageUrl?.trim() || undefined;
    setDisplaySrc(c && c.length > 0 ? c : fallbackProductImageUrl ?? null);
  }, [categoryImageUrl, fallbackProductImageUrl]);

  const handleImgError = () => {
    setDisplaySrc((prev) => {
      const c = categoryImageUrl?.trim() || undefined;
      if (prev && c && prev === c && fallbackProductImageUrl && prev !== fallbackProductImageUrl) {
        return fallbackProductImageUrl;
      }
      return null;
    });
  };

  if (!displaySrc) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-center"
        aria-hidden
      >
        <span className="line-clamp-2 px-2 text-xs font-medium text-gray-400">{categoryName}</span>
      </div>
    );
  }

  return (
    <img
      key={displaySrc}
      src={displaySrc}
      alt=""
      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
      loading="lazy"
      decoding="async"
      onError={handleImgError}
    />
  );
}

export function Header() {
  const { categories } = useCategories();
  const { products } = useProducts();
  const categoriesForDisplay = useMemo(
    () => sortCategoriesByProductCount(categories, products),
    [categories, products]
  );
  const firstProductImageByCategory = useMemo(() => {
    const raw = buildFirstProductImageByCategoryName(products);
    const m = new Map<string, string>();
    for (const [name, url] of raw.entries()) {
      m.set(name, normalizeImageApiUrl(url));
    }
    return m;
  }, [products]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [megaMenuTopPx, setMegaMenuTopPx] = useState(0);
  const headerRef = useRef<HTMLElement>(null);
  const megaMenuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [logoConfig, setLogoConfig] = useState<HeaderLogoConfig>({ text: 'ByValsue', imageUrl: null, link: '/' });
  const [bannerConfig, setBannerConfig] = useState<PromotionalBannerConfig>({ text: '', isVisible: false });
  const { getTotalItems } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const cartItemsCount = getTotalItems();
  const wishlistCount = wishlistItems.length;

  useEffect(() => {
    loadHeaderConfigs();
  }, []);

  useLayoutEffect(() => {
    if (!isMegaMenuOpen) return;
    const header = headerRef.current;
    if (!header) return;
    const syncTop = () => setMegaMenuTopPx(header.getBoundingClientRect().bottom);
    syncTop();
    window.addEventListener('resize', syncTop);
    window.addEventListener('scroll', syncTop, { passive: true });
    return () => {
      window.removeEventListener('resize', syncTop);
      window.removeEventListener('scroll', syncTop);
    };
  }, [isMegaMenuOpen]);

  useEffect(
    () => () => {
      if (megaMenuCloseTimerRef.current) {
        clearTimeout(megaMenuCloseTimerRef.current);
      }
    },
    []
  );

  const cancelMegaMenuClose = () => {
    if (megaMenuCloseTimerRef.current) {
      clearTimeout(megaMenuCloseTimerRef.current);
      megaMenuCloseTimerRef.current = null;
    }
  };

  const openMegaMenu = () => {
    cancelMegaMenuClose();
    setIsMegaMenuOpen(true);
  };

  const scheduleCloseMegaMenu = () => {
    cancelMegaMenuClose();
    megaMenuCloseTimerRef.current = setTimeout(() => {
      setIsMegaMenuOpen(false);
      megaMenuCloseTimerRef.current = null;
    }, 220);
  };

  const loadHeaderConfigs = async () => {
    try {
      // Charger toutes les configs pour pouvoir vérifier is_active
      const { data, error } = await supabase
        .from('landing_page_config')
        .select('*')
        .in('section_key', ['header.logo', 'header.promotional_banner']);

      if (error) {
        console.warn('Erreur lors du chargement des configurations du header:', error);
        // Les valeurs par défaut sont déjà définies dans useState
        return;
      }

      if (data) {
        data.forEach((config) => {
          // Vérifier explicitement is_active car les utilisateurs authentifiés
          // peuvent avoir accès à toutes les configs via RLS
          if (!config.is_active) {
            // Si la bannière est désactivée, la masquer
            if (config.section_key === 'header.promotional_banner') {
              setBannerConfig({ text: '', isVisible: false });
            }
            return;
          }

          if (config.section_key === 'header.logo') {
            setLogoConfig(config.config_data as HeaderLogoConfig);
          } else if (config.section_key === 'header.promotional_banner') {
            // La bannière est active, utiliser la config_data
            const bannerData = config.config_data as PromotionalBannerConfig;
            setBannerConfig({
              text: bannerData.text || '',
              isVisible: bannerData.isVisible !== false // Par défaut visible si pas spécifié
            });
          }
        });
      }
      // Si la bannière n'est pas dans les résultats, elle reste masquée (valeur par défaut)
    } catch (error) {
      console.error('Erreur lors du chargement des configurations:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/boutique?search=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-40 bg-white/60 backdrop-blur-lg shadow-sm"
      >
        {/* Bannière promotionnelle */}
        {bannerConfig.isVisible && (
          <div className="bg-secondary/90 backdrop-blur-sm text-white text-center py-2 text-sm font-medium">
            <p>{bannerConfig.text}</p>
          </div>
        )}

        {/* Navigation principale */}
        <nav className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={logoConfig.link} className="flex items-center gap-2">
              {logoConfig.imageUrl ? (
                <img
                  src={logoConfig.imageUrl}
                  alt={logoConfig.text}
                  className="h-8 w-auto"
                />
              ) : (
                <span className="text-2xl font-heading font-bold text-secondary drop-shadow-lg">
                  {logoConfig.text}
                </span>
              )}
            </Link>

            {/* Menu desktop */}
            <div className="hidden lg:flex min-h-16 items-center gap-8">
              <Link
                to="/"
                className="text-text-dark hover:text-secondary transition-colors font-semibold drop-shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 rounded px-2 py-1"
              >
                Accueil
              </Link>
              <div
                className="relative flex min-h-16 items-center self-stretch"
                onMouseEnter={openMegaMenu}
                onMouseLeave={scheduleCloseMegaMenu}
                onFocus={openMegaMenu}
                onBlur={(e) => {
                  // Ne fermer que si le focus sort complètement du menu
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    cancelMegaMenuClose();
                    setIsMegaMenuOpen(false);
                  }
                }}
              >
                <Link
                  to="/boutique"
                  className={`text-text-dark hover:text-secondary transition-colors font-semibold drop-shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 rounded px-2 py-1 ${
                    isMegaMenuOpen ? 'text-secondary' : ''
                  }`}
                  aria-expanded={isMegaMenuOpen}
                  aria-haspopup="true"
                >
                  Boutique
                </Link>
                {isMegaMenuOpen && (
                  <div
                    className="fixed left-1/2 z-[100] w-[min(80rem,calc(100vw-2rem))] -translate-x-1/2 pt-4"
                    style={{ top: megaMenuTopPx }}
                    role="region"
                    aria-label="Catégories de la boutique"
                    onMouseEnter={openMegaMenu}
                  >
                    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="mega-menu-scroll max-h-[min(75vh,calc(100dvh-5.5rem))] overflow-y-auto overscroll-contain p-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {categoriesForDisplay.map((category) => (
                        <Link
                          key={category.id}
                          to={`/boutique?category=${category.slug}`}
                          className="group relative overflow-hidden rounded-xl bg-gray-50 hover:bg-white transition-all duration-300 hover:shadow-lg"
                          onClick={() => setIsMegaMenuOpen(false)}
                        >
                          <div className="aspect-[4/3] overflow-hidden rounded-t-xl bg-gradient-to-br from-gray-100 to-gray-200">
                            <MegaMenuCategoryImage
                              categoryName={category.name}
                              categoryImageUrl={
                                category.image?.trim() ? normalizeImageApiUrl(category.image.trim()) : undefined
                              }
                              fallbackProductImageUrl={firstProductImageByCategory.get(category.name)}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-heading font-semibold text-text-dark group-hover:text-secondary transition-colors text-lg mb-1">
                              {category.name}
                            </h3>
                            {category.description && (
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {category.description}
                              </p>
                            )}
                            <div className="mt-3 flex items-center text-secondary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              Découvrir
                              <svg
                                className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                    {categoriesForDisplay.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        Aucune catégorie disponible
                      </div>
                    )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <Link
                to="/boutique?filter=new"
                className="text-text-dark hover:text-secondary transition-colors font-semibold drop-shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 rounded px-2 py-1"
              >
                Nouveautés
              </Link>
              <Link
                to="/boutique?filter=sale"
                className="text-text-dark hover:text-secondary transition-colors font-semibold drop-shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 rounded px-2 py-1"
              >
                Soldes
              </Link>
              <Link
                to="/blog"
                className="text-text-dark hover:text-secondary transition-colors font-semibold drop-shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 rounded px-2 py-1"
              >
                Blog
              </Link>
              <Link
                to="/contact"
                className="text-text-dark hover:text-secondary transition-colors font-semibold drop-shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 rounded px-2 py-1"
              >
                Contact
              </Link>
            </div>

            {/* Icônes droite */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="text-text-dark hover:text-secondary transition-colors drop-shadow-sm p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Rechercher un produit"
                aria-expanded={isSearchOpen}
              >
                <Search size={22} />
              </button>
              <Link
                to={isAuthenticated ? '/compte' : '/connexion'}
                className="text-text-dark hover:text-secondary transition-colors drop-shadow-sm p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={isAuthenticated ? 'Mon compte' : 'Se connecter'}
              >
                <User size={22} />
              </Link>
              <Link
                to="/wishlist"
                className="text-text-dark hover:text-secondary transition-colors relative drop-shadow-sm p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={`Wishlist${wishlistCount > 0 ? `, ${wishlistCount} article${wishlistCount > 1 ? 's' : ''}` : ''}`}
              >
                <Heart size={22} />
                {wishlistCount > 0 && (
                  <Badge
                    variant="accent"
                    className="absolute -top-2 -right-2 text-[10px] min-w-[18px] h-[18px] p-0"
                    aria-hidden="true"
                  >
                    {wishlistCount}
                  </Badge>
                )}
              </Link>
              <Link
                to="/panier"
                className="text-text-dark hover:text-secondary transition-colors relative drop-shadow-sm p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={`Panier${cartItemsCount > 0 ? `, ${cartItemsCount} article${cartItemsCount > 1 ? 's' : ''}` : ''}`}
              >
                <ShoppingCart size={22} />
                {cartItemsCount > 0 && (
                  <Badge
                    variant="accent"
                    className="absolute -top-2 -right-2 text-[10px] min-w-[18px] h-[18px] p-0"
                    aria-hidden="true"
                  >
                    {cartItemsCount}
                  </Badge>
                )}
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden text-text-dark hover:text-secondary transition-colors drop-shadow-sm p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Menu de navigation"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </nav>

        {/* Menu mobile */}
        <div 
          id="mobile-menu" 
          className={`lg:hidden border-t border-neutral-support bg-white/95 backdrop-blur-md transition-all duration-300 ease-in-out ${
            isMobileMenuOpen 
              ? 'max-h-screen opacity-100' 
              : 'max-h-0 opacity-0 overflow-hidden'
          }`}
          role="menu" 
          aria-label="Menu de navigation"
        >
          <div className="container mx-auto px-4 py-4 space-y-3">
              <Link
                to="/"
                className="block py-3 px-2 text-text-dark hover:text-secondary hover:bg-primary/10 rounded-lg transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
                onClick={() => setIsMobileMenuOpen(false)}
                role="menuitem"
              >
                Accueil
              </Link>
              <Link
                to="/boutique"
                className="block py-3 px-2 text-text-dark hover:text-secondary hover:bg-primary/10 rounded-lg transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
                onClick={() => setIsMobileMenuOpen(false)}
                role="menuitem"
              >
                Boutique
              </Link>
              <Link
                to="/boutique?filter=new"
                className="block py-3 px-2 text-text-dark hover:text-secondary hover:bg-primary/10 rounded-lg transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
                onClick={() => setIsMobileMenuOpen(false)}
                role="menuitem"
              >
                Nouveautés
              </Link>
              <Link
                to="/boutique?filter=sale"
                className="block py-3 px-2 text-text-dark hover:text-secondary hover:bg-primary/10 rounded-lg transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
                onClick={() => setIsMobileMenuOpen(false)}
                role="menuitem"
              >
                Soldes
              </Link>
              <Link
                to="/blog"
                className="block py-3 px-2 text-text-dark hover:text-secondary hover:bg-primary/10 rounded-lg transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
                onClick={() => setIsMobileMenuOpen(false)}
                role="menuitem"
              >
                Blog
              </Link>
              <Link
                to="/contact"
                className="block py-3 px-2 text-text-dark hover:text-secondary hover:bg-primary/10 rounded-lg transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
                onClick={() => setIsMobileMenuOpen(false)}
                role="menuitem"
              >
                Contact
              </Link>
              {isAuthenticated && (
                <>
                  <Link
                    to="/compte"
                    className="block py-3 px-2 text-text-dark hover:text-secondary hover:bg-primary/10 rounded-lg transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                    role="menuitem"
                  >
                    Mon compte
                  </Link>
                  <button
                    onClick={async () => {
                      await logout();
                      setIsMobileMenuOpen(false);
                      navigate('/');
                    }}
                    className="block py-3 px-2 text-text-dark hover:text-secondary hover:bg-primary/10 rounded-lg transition-colors w-full text-left min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
                    role="menuitem"
                  >
                    Déconnexion
                  </button>
                </>
              )}
            </div>
          </div>
      </header>

      {/* Modal recherche */}
      <Modal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} size="lg">
        <form onSubmit={handleSearch} className="space-y-4">
          <h2 className="text-xl font-heading font-semibold text-text-dark mb-4">Rechercher</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un produit..."
              className="flex-1 px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
              autoFocus
            />
            <Button type="submit">Rechercher</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

