import { useState, useEffect } from 'react';
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

export function Header() {
  const { categories } = useCategories();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [logoConfig, setLogoConfig] = useState<HeaderLogoConfig>({ text: 'ByValsue', imageUrl: null, link: '/' });
  const [bannerConfig, setBannerConfig] = useState<PromotionalBannerConfig>({ text: 'Livraison gratuite à partir de 200 000 Ar • Retours gratuits', isVisible: true });
  const { getTotalItems } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const cartItemsCount = getTotalItems();
  const wishlistCount = wishlistItems.length;

  useEffect(() => {
    loadHeaderConfigs();
  }, []);

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
          // Ne charger que si la section est active
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
            setBannerConfig(config.config_data as PromotionalBannerConfig);
          }
        });
      }
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
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        {/* Bannière promotionnelle */}
        {bannerConfig.isVisible && (
          <div className="bg-secondary text-white text-center py-2 text-sm font-medium">
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
                <span className="text-2xl font-heading font-bold text-secondary">
                  {logoConfig.text}
                </span>
              )}
            </Link>

            {/* Menu desktop */}
            <div className="hidden lg:flex items-center gap-8">
              <Link
                to="/"
                className="text-text-dark hover:text-secondary transition-colors font-semibold"
              >
                Accueil
              </Link>
              <div
                className="relative"
                onMouseEnter={() => setIsMegaMenuOpen(true)}
                onMouseLeave={() => setIsMegaMenuOpen(false)}
              >
                <Link
                  to="/boutique"
                  className="text-text-dark hover:text-secondary transition-colors font-semibold"
                >
                  Boutique
                </Link>
                {isMegaMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-screen max-w-6xl bg-white shadow-xl rounded-lg p-6 grid grid-cols-3 gap-6">
                    {categories.map((category) => (
                      <Link
                        key={category.id}
                        to={`/boutique?category=${category.slug}`}
                        className="group"
                        onClick={() => setIsMegaMenuOpen(false)}
                      >
                        <div className="aspect-video overflow-hidden rounded-lg mb-2">
                          <img
                            src={category.image}
                            alt={category.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <p className="font-heading font-medium text-text-dark group-hover:text-secondary transition-colors">
                          {category.name}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <Link
                to="/boutique?filter=new"
                className="text-text-dark hover:text-secondary transition-colors font-semibold"
              >
                Nouveautés
              </Link>
              <Link
                to="/boutique?filter=sale"
                className="text-text-dark hover:text-secondary transition-colors font-semibold"
              >
                Soldes
              </Link>
              <Link
                to="/blog"
                className="text-text-dark hover:text-secondary transition-colors font-semibold"
              >
                Blog
              </Link>
              <Link
                to="/contact"
                className="text-text-dark hover:text-secondary transition-colors font-semibold"
              >
                Contact
              </Link>
            </div>

            {/* Icônes droite */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="text-text-dark hover:text-secondary transition-colors"
                aria-label="Rechercher"
              >
                <Search size={22} />
              </button>
              <Link
                to={isAuthenticated ? '/compte' : '/connexion'}
                className="text-text-dark hover:text-secondary transition-colors"
                aria-label="Compte"
              >
                <User size={22} />
              </Link>
              <Link
                to="/wishlist"
                className="text-text-dark hover:text-secondary transition-colors relative"
                aria-label="Wishlist"
              >
                <Heart size={22} />
                {wishlistCount > 0 && (
                  <Badge
                    variant="accent"
                    className="absolute -top-2 -right-2 text-[10px] min-w-[18px] h-[18px] p-0"
                  >
                    {wishlistCount}
                  </Badge>
                )}
              </Link>
              <Link
                to="/panier"
                className="text-text-dark hover:text-secondary transition-colors relative"
                aria-label="Panier"
              >
                <ShoppingCart size={22} />
                {cartItemsCount > 0 && (
                  <Badge
                    variant="accent"
                    className="absolute -top-2 -right-2 text-[10px] min-w-[18px] h-[18px] p-0"
                  >
                    {cartItemsCount}
                  </Badge>
                )}
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden text-text-dark hover:text-secondary transition-colors"
                aria-label="Menu"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </nav>

        {/* Menu mobile */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-neutral-support bg-white">
            <div className="container mx-auto px-4 py-4 space-y-3">
              <Link
                to="/"
                className="block py-2 text-text-dark hover:text-secondary transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Accueil
              </Link>
              <Link
                to="/boutique"
                className="block py-2 text-text-dark hover:text-secondary transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Boutique
              </Link>
              <Link
                to="/boutique?filter=new"
                className="block py-2 text-text-dark hover:text-secondary transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Nouveautés
              </Link>
              <Link
                to="/boutique?filter=sale"
                className="block py-2 text-text-dark hover:text-secondary transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Soldes
              </Link>
              <Link
                to="/blog"
                className="block py-2 text-text-dark hover:text-secondary transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Blog
              </Link>
              <Link
                to="/contact"
                className="block py-2 text-text-dark hover:text-secondary transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact
              </Link>
              {isAuthenticated && (
                <>
                  <Link
                    to="/compte"
                    className="block py-2 text-text-dark hover:text-secondary transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Mon compte
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="block py-2 text-text-dark hover:text-secondary transition-colors w-full text-left"
                  >
                    Déconnexion
                  </button>
                </>
              )}
            </div>
          </div>
        )}
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

