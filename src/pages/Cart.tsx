import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/Button';
import { formatPrice } from '../utils/formatters';
import { QuantitySelector } from '../components/product/QuantitySelector';

export function Cart() {
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
                className="flex-shrink-0 w-full sm:w-32 h-32 overflow-hidden rounded-lg"
              >
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="w-full h-full object-cover"
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
                  <p className="text-sm text-text-dark/80 mb-2">
                    Taille: {item.size} • Couleur: {item.color}
                  </p>
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
            <Button variant="outline" onClick={clearCart}>
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
                <span className="font-medium">
                  {shippingCost === 0 ? (
                    <span className="text-green-600">Gratuite</span>
                  ) : (
                    formatPrice(shippingCost)
                  )}
                </span>
              </div>
              {getSubtotal() < 200000 && (
                <p className="text-sm text-accent">
                  Ajoutez {formatPrice(200000 - getSubtotal())} pour la livraison gratuite
                </p>
              )}
            </div>

            <div className="border-t border-neutral-support pt-4 mb-6">
              <div className="flex justify-between text-lg font-bold text-text-dark">
                <span>Total</span>
                <span>{formatPrice(getTotal(shippingCost))}</span>
              </div>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Code promo"
                className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary mb-2"
              />
              <Button variant="outline" className="w-full">
                Appliquer
              </Button>
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

