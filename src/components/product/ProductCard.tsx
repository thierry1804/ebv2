import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Product } from '../../types';
import { formatPrice } from '../../utils/formatters';
import { useWishlist } from '../../context/WishlistContext';
import { cn } from '../../utils/cn';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const inWishlist = isInWishlist(product.id);
  const displayPrice = product.salePrice || product.price;
  const hasSale = product.isOnSale && product.salePrice;
  const hasMultipleImages = product.images && product.images.length > 1;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextImageIndex, setNextImageIndex] = useState(1);
  const [opacity, setOpacity] = useState(1);
  const currentIndexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synchroniser la ref avec l'état
  useEffect(() => {
    currentIndexRef.current = currentImageIndex;
  }, [currentImageIndex]);

  // Carrousel automatique avec durée aléatoire entre 3 et 5 secondes
  useEffect(() => {
    if (!hasMultipleImages) return;

    const scheduleNext = () => {
      // Nettoyer les timeouts précédents
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

      // Durée aléatoire entre 3000ms et 5000ms
      const delay = Math.random() * 2000 + 3000;
      
      timeoutRef.current = setTimeout(() => {
        // Préparer la prochaine image
        const nextIndex = (currentIndexRef.current + 1) % product.images.length;
        setNextImageIndex(nextIndex);
        setOpacity(0);
        
        // Après la transition, mettre à jour l'index actuel
        transitionTimeoutRef.current = setTimeout(() => {
          currentIndexRef.current = nextIndex;
          setCurrentImageIndex(nextIndex);
          setOpacity(1);
          // Programmer la prochaine transition
          scheduleNext();
        }, 800); // Durée de la transition crossfade
      }, delay);
    };

    // Initialiser la ref et l'index suivant
    currentIndexRef.current = currentImageIndex;
    if (product.images.length > 1) {
      setNextImageIndex((currentImageIndex + 1) % product.images.length);
    }

    // Démarrer le premier cycle
    scheduleNext();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
  }, [hasMultipleImages, product.images.length]);

  // Réinitialiser l'index quand on quitte la carte (hover out)
  const handleMouseLeave = () => {
    if (hasMultipleImages) {
      // Nettoyer les timeouts
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      
      // Réinitialiser les états
      currentIndexRef.current = 0;
      setCurrentImageIndex(0);
      setNextImageIndex(1);
      setOpacity(1);
    }
  };

  return (
    <div 
      className="group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
      onMouseLeave={handleMouseLeave}
    >
      <Link to={`/produit/${product.id}`} className="block">
        <div className="relative overflow-hidden aspect-square bg-neutral-support">
          {/* Placeholder skeleton pendant le chargement */}
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-support to-neutral-support/50 animate-pulse" aria-hidden="true" />
          
          {/* Image actuelle */}
          <img
            src={product.images[currentImageIndex]}
            alt={product.name}
            className={cn(
              "absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-opacity duration-[800ms] ease-in-out",
              opacity === 1 ? "opacity-100" : "opacity-0"
            )}
            loading="lazy"
            decoding="async"
            onLoad={(e) => {
              // Masquer le placeholder une fois l'image chargée
              const placeholder = e.currentTarget.parentElement?.querySelector('.animate-pulse');
              if (placeholder) {
                placeholder.classList.add('opacity-0', 'transition-opacity', 'duration-300');
              }
            }}
          />
          {/* Image suivante pour le crossfade */}
          {hasMultipleImages && (
            <img
              src={product.images[nextImageIndex]}
              alt={product.name}
              className={cn(
                "absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-opacity duration-[800ms] ease-in-out",
                opacity === 0 ? "opacity-100" : "opacity-0"
              )}
              loading="lazy"
              decoding="async"
            />
          )}
          {product.isNew && (
            <span className="absolute top-2 left-2 bg-accent text-white px-2 py-1 rounded text-xs font-semibold shadow-md">
              Nouveau
            </span>
          )}
          {hasSale && (
            <span className="absolute top-2 right-2 bg-secondary text-white px-2 py-1 rounded text-xs font-semibold shadow-md">
              -{Math.round(((product.price - product.salePrice!) / product.price) * 100)}%
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-heading font-medium text-text-dark mb-2 line-clamp-2 group-hover:text-secondary transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-2 mb-2">
            {hasSale && (
              <span className="text-sm text-neutral-support line-through">
                {formatPrice(product.price)}
              </span>
            )}
            <span className={cn('font-semibold', hasSale ? 'text-secondary' : 'text-text-dark')}>
              {formatPrice(displayPrice)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sm text-neutral-support">
            <span>★</span>
            <span>{product.rating.toFixed(1)}</span>
            <span className="text-xs">({product.reviewCount})</span>
          </div>
        </div>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          toggleWishlist(product);
        }}
        className={cn(
          'absolute top-2 right-2 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200',
          inWishlist
            ? 'text-secondary hover:bg-white'
            : 'text-text-dark hover:text-secondary hover:bg-white'
        )}
        aria-label={inWishlist ? 'Retirer de la wishlist' : 'Ajouter à la wishlist'}
      >
        <Heart size={20} fill={inWishlist ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}

