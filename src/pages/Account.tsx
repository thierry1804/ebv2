import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useOrders } from '../hooks/useOrders';
import { Button } from '../components/ui/Button';
import { ProductCard } from '../components/product/ProductCard';
import { Loading } from '../components/ui/Loading';
import { formatPrice } from '../utils/formatters';
import { Order } from '../types';
import { Link } from 'react-router-dom';

type Tab = 'profile' | 'orders' | 'addresses' | 'wishlist' | 'settings';

export default function Account() {
  const { user, isAuthenticated, logout } = useAuth();
  const { items: wishlistItems } = useWishlist();
  const { getUserOrders, isLoading: isLoadingOrders } = useOrders();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [orders, setOrders] = useState<Order[]>([]);

  // Charger les commandes quand l'onglet orders est actif
  useEffect(() => {
    if (activeTab === 'orders' && user?.id && orders.length === 0) {
      loadOrders();
    }
  }, [activeTab, user?.id]);

  const loadOrders = async () => {
    if (!user?.id) return;
    const userOrders = await getUserOrders(user.id);
    setOrders(userOrders);
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-heading font-bold text-text-dark mb-4">
          Connexion requise
        </h2>
        <p className="text-text-dark/80 mb-8">
          Veuillez vous connecter pour accéder à votre compte.
        </p>
        <Link to="/connexion">
          <Button variant="primary">Se connecter</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-heading font-bold text-text-dark mb-8">Mon Compte</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Menu latéral */}
        <aside className="lg:col-span-1">
          <nav className="bg-white rounded-lg p-4 shadow-sm space-y-2">
            {[
              { id: 'profile', label: 'Mon profil' },
              { id: 'orders', label: 'Mes commandes' },
              { id: 'addresses', label: 'Mes adresses' },
              { id: 'wishlist', label: 'Ma wishlist' },
              { id: 'settings', label: 'Paramètres' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'text-text-dark hover:bg-neutral-support'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              onClick={logout}
              className="w-full text-left px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors mt-4"
            >
              Déconnexion
            </button>
          </nav>
        </aside>

        {/* Contenu */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-2xl font-heading font-semibold text-text-dark mb-6">
                  Mon profil
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={user?.firstName || ''}
                      className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">Nom</label>
                    <input
                      type="text"
                      value={user?.lastName || ''}
                      className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={user?.phone || ''}
                      className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <h2 className="text-2xl font-heading font-semibold text-text-dark mb-6">
                  Mes commandes
                </h2>
                {isLoadingOrders ? (
                  <div className="flex justify-center py-8">
                    <Loading />
                  </div>
                ) : orders.length === 0 ? (
                  <p className="text-text-dark/80">
                    Vous n'avez pas encore passé de commande.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="border-2 border-neutral-support rounded-lg p-4 hover:border-primary transition-colors"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <h3 className="text-lg font-semibold text-text-dark">
                                Commande {order.orderNumber}
                              </h3>
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  order.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : order.status === 'confirmed'
                                    ? 'bg-blue-100 text-blue-800'
                                    : order.status === 'shipped'
                                    ? 'bg-purple-100 text-purple-800'
                                    : order.status === 'delivered'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {order.status === 'pending'
                                  ? 'En attente'
                                  : order.status === 'confirmed'
                                  ? 'Confirmée'
                                  : order.status === 'shipped'
                                  ? 'Expédiée'
                                  : order.status === 'delivered'
                                  ? 'Livrée'
                                  : 'Annulée'}
                              </span>
                            </div>
                            <p className="text-sm text-text-dark/80 mb-2">
                              Passée le {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                            <p className="text-sm text-text-dark/80">
                              {order.items.length} article{order.items.length > 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-text-dark mb-1">
                              {formatPrice(order.total)}
                            </p>
                            <p className="text-xs text-text-dark/60">
                              {order.paymentMethod === 'cash_on_delivery'
                                ? 'Paiement à la livraison'
                                : 'Mobile Money'}
                            </p>
                          </div>
                        </div>
                        {order.items.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-neutral-support">
                            <div className="space-y-2">
                              {order.items.slice(0, 3).map((item) => (
                                <div key={item.id} className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded bg-neutral-support overflow-hidden">
                                    <img
                                      src={item.product.images[0]}
                                      alt={item.product.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-text-dark">
                                      {item.product.name}
                                    </p>
                                    <p className="text-xs text-text-dark/80">
                                      {item.size && `${item.size}`}
                                      {item.size && item.color && ' • '}
                                      {item.color && `${item.color}`}
                                      {(item.size || item.color) && ' • '}
                                      Quantité: {item.quantity}
                                    </p>
                                  </div>
                                  <p className="text-sm font-semibold text-text-dark">
                                    {formatPrice(item.price * item.quantity)}
                                  </p>
                                </div>
                              ))}
                              {order.items.length > 3 && (
                                <p className="text-sm text-text-dark/80 text-center pt-2">
                                  + {order.items.length - 3} autre{order.items.length - 3 > 1 ? 's' : ''} article{order.items.length - 3 > 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'addresses' && (
              <div>
                <h2 className="text-2xl font-heading font-semibold text-text-dark mb-6">
                  Mes adresses
                </h2>
                <p className="text-text-dark/80 mb-4">
                  Vous n'avez pas encore enregistré d'adresse.
                </p>
                <Button variant="outline">Ajouter une adresse</Button>
              </div>
            )}

            {activeTab === 'wishlist' && (
              <div>
                <h2 className="text-2xl font-heading font-semibold text-text-dark mb-6">
                  Ma wishlist
                </h2>
                {wishlistItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wishlistItems.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <p className="text-text-dark/80">
                    Votre wishlist est vide. Ajoutez des produits que vous aimez !
                  </p>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h2 className="text-2xl font-heading font-semibold text-text-dark mb-6">
                  Paramètres
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="text-primary" />
                      <span>Recevoir les newsletters</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="text-primary" />
                      <span>Notifications par email</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

