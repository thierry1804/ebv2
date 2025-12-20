import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { Button } from '../components/ui/Button';
import { ProductCard } from '../components/product/ProductCard';
import { Link } from 'react-router-dom';

type Tab = 'profile' | 'orders' | 'addresses' | 'wishlist' | 'settings';

export function Account() {
  const { user, isAuthenticated, logout } = useAuth();
  const { items: wishlistItems } = useWishlist();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

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
                <p className="text-text-dark/80">
                  Vous n'avez pas encore passé de commande.
                </p>
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

