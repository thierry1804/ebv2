import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/Button';
import { formatPrice } from '../utils/formatters';
import { QuantitySelector } from '../components/product/QuantitySelector';
import toast from 'react-hot-toast';

export default function Cart() {
  const { items, removeItem, updateQuantity, getSubtotal, getTotal, clearCart } = useCart();
  const shippingCost = getSubtotal() >= 200000 ? 0 : 10000;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <ShoppingBag size={64} className="mx-auto mb-6 text-neutral-support" />
          <h2 className="text-2xl font-heading font-bold text-text-dark mb-4">
            Votre panier est vide
          </h2>
          <p className="text-text-dark/80 mb-8">
            Découvrez nos collections et ajoutez vos articles préférés à votre panier.
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
      <h1 className="text-3xl font-heading font-bold text-text-dark mb-8">Mon Panier</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Liste des articles */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg p-6 shadow-sm flex flex-col sm:flex-row gap-4"
            >
              <Link
                to={`/produit/${item.productId}`}
                className="flex-shrink-0 w-full sm:w-32 h-32 overflow-hidden rounded-lg bg-neutral-support relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-support to-neutral-support/50 animate-pulse" aria-hidden="true" />
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="w-full h-full object-cover relative z-10"
                  loading="lazy"
                  decoding="async"
                  onLoad={(e) => {
                    const placeholder = e.currentTarget.parentElement?.querySelector('.animate-pulse');
                    if (placeholder) {
                      placeholder.classList.add('opacity-0', 'transition-opacity', 'duration-300');
                    }
                  }}
                />
              </Link>

              <div className="flex-1 flex flex-col sm:flex-row sm:justify-between gap-4">
                <div className="flex-1">
                  <Link
                    to={`/produit/${item.productId}`}
                    className="font-heading font-medium text-text-dark hover:text-secondary transition-colors mb-2 block"
                  >
                    {item.product.name}
                  </Link>
                  {((item.size || item.color) && (
                    <p className="text-sm text-text-dark/80 mb-2">
                      {item.size && `Taille: ${item.size}`}
                      {item.size && item.color && ' • '}
                      {item.color && `Couleur: ${item.color}`}
                    </p>
                  ))}
                  <p className="text-lg font-semibold text-text-dark">
                    {formatPrice(item.price)}
                  </p>
                </div>

                <div className="flex items-start sm:items-center gap-4">
                  <div className="flex-shrink-0">
                    <QuantitySelector
                      quantity={item.quantity}
                      onIncrease={() => updateQuantity(item.id, item.quantity + 1)}
                      onDecrease={() => updateQuantity(item.id, item.quantity - 1)}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-text-dark mb-2">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-600 hover:text-red-700 transition-colors"
                      aria-label="Supprimer"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                if (window.confirm('Êtes-vous sûr de vouloir vider votre panier ?')) {
                  clearCart();
                  toast.success('Panier vidé');
                }
              }}
            >
              Vider le panier
            </Button>
          </div>
        </div>

        {/* Résumé */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg p-6 shadow-sm sticky top-24">
            <h2 className="text-xl font-heading font-semibold text-text-dark mb-6">
              Résumé de la commande
            </h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-text-dark/80">
                <span>Sous-total</span>
                <span className="font-medium">{formatPrice(getSubtotal())}</span>
              </div>
              <div className="flex justify-between text-text-dark/80">
                <span>Livraison</span>
                <span className="font-medium text-text-dark/60 italic">En sus</span>
              </div>
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Le coût de livraison sera calculé et facturé séparément lors de la livraison.
                </p>
              </div>
            </div>

            <div className="border-t border-neutral-support pt-4 mb-6">
              <div className="flex justify-between text-lg font-bold text-text-dark">
                <span>Total</span>
                <span>{formatPrice(getSubtotal())}</span>
              </div>
            </div>

            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium mb-1">
                🎁 Livraison gratuite à partir de 200 000 Ar
              </p>
              {getSubtotal() < 200000 && (
                <p className="text-xs text-green-700">
                  Il vous reste {formatPrice(200000 - getSubtotal())} pour bénéficier de la livraison gratuite
                </p>
              )}
            </div>

            <Link to="/checkout">
              <Button variant="primary" size="lg" className="w-full">
                Commander
              </Button>
            </Link>

            <Link
              to="/boutique"
              className="block text-center text-text-dark/80 hover:text-secondary transition-colors mt-4"
            >
              Continuer mes achats
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

