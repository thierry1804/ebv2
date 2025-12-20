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

  return (
    <div className="group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
      <Link to={`/produit/${product.id}`} className="block">
        <div className="relative overflow-hidden aspect-square">
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
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

