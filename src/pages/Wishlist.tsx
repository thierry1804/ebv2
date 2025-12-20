import { useWishlist } from '../context/WishlistContext';
import { ProductCard } from '../components/product/ProductCard';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function Wishlist() {
  const { items } = useWishlist();

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <Heart size={64} className="mx-auto mb-6 text-neutral-support" />
          <h2 className="text-2xl font-heading font-bold text-text-dark mb-4">
            Votre wishlist est vide
          </h2>
          <p className="text-text-dark/80 mb-8">
            Ajoutez des produits que vous aimez à votre wishlist pour les retrouver facilement.
          </p>
          <Link to="/boutique">
            <Button variant="primary" size="lg">
              Découvrir la boutique
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-heading font-bold text-text-dark mb-8">Ma Wishlist</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

