import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useAddresses } from '../hooks/useAddresses';
import { Button } from '../components/ui/Button';
import { ProductCard } from '../components/product/ProductCard';
import { Loading } from '../components/ui/Loading';
import { Link, useNavigate } from 'react-router-dom';
import { Address } from '../types';

type Tab = 'profile' | 'addresses' | 'wishlist' | 'settings';

export default function Account() {
  const { user, isAuthenticated, logout } = useAuth();
  const { items: wishlistItems } = useWishlist();
  const { addresses, isLoading: isLoadingAddresses, error: addressesError, getUserAddresses, createAddress, updateAddress, deleteAddress, setAddresses } = useAddresses();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<Partial<Address>>({
    label: '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    street: '',
    city: '',
    postalCode: '',
    country: 'Madagascar',
    phone: user?.phone || '',
    isDefault: false,
  });

  // Charger les adresses quand l'onglet addresses est actif
  useEffect(() => {
    if (activeTab === 'addresses' && user?.id && isAuthenticated) {
      loadAddresses();
    }
  }, [activeTab, user?.id, isAuthenticated]);

  const loadAddresses = async () => {
    if (!user?.id) return;
    const userAddresses = await getUserAddresses(user.id);
    setAddresses(userAddresses);
  };

  const handleAddAddress = () => {
    setFormData({
      label: '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      street: '',
      city: '',
      postalCode: '',
      country: 'Madagascar',
      phone: user?.phone || '',
      isDefault: false,
    });
    setEditingAddress(null);
    setShowAddForm(true);
  };

  const handleEditAddress = (address: Address) => {
    setFormData({
      label: address.label,
      firstName: address.firstName,
      lastName: address.lastName,
      street: address.street,
      city: address.city,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone,
      isDefault: address.isDefault || false,
    });
    setEditingAddress(address);
    setShowAddForm(true);
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingAddress(null);
    setFormData({
      label: '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      street: '',
      city: '',
      postalCode: '',
      country: 'Madagascar',
      phone: user?.phone || '',
      isDefault: false,
    });
  };

  const handleSubmitAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!formData.label || !formData.firstName || !formData.lastName || !formData.street || !formData.city || !formData.phone) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const addressData: Omit<Address, 'id'> = {
      label: formData.label!,
      firstName: formData.firstName!,
      lastName: formData.lastName!,
      street: formData.street!,
      city: formData.city!,
      postalCode: formData.postalCode || '',
      country: formData.country || 'Madagascar',
      phone: formData.phone!,
      isDefault: formData.isDefault || false,
    };

    if (editingAddress) {
      const updated = await updateAddress(editingAddress.id, user.id, addressData);
      if (updated) {
        await loadAddresses();
        handleCancelForm();
      }
    } else {
      const created = await createAddress(user.id, addressData);
      if (created) {
        await loadAddresses();
        handleCancelForm();
      }
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user?.id) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette adresse ?')) return;

    const success = await deleteAddress(addressId, user.id);
    if (success) {
      await loadAddresses();
    }
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
            <button
              onClick={() => {
                setActiveTab('profile');
                navigate('/compte');
              }}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'profile'
                  ? 'bg-primary text-white'
                  : 'text-text-dark hover:bg-neutral-support'
              }`}
            >
              Mon profil
            </button>
            <button
              onClick={() => navigate('/compte/mes-commandes')}
              className="w-full text-left px-4 py-2 rounded-lg transition-colors text-text-dark hover:bg-neutral-support"
            >
              Mes commandes
            </button>
            {[
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
              onClick={async () => {
                await logout();
                navigate('/');
              }}
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


            {activeTab === 'addresses' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-heading font-semibold text-text-dark">
                    Mes adresses
                  </h2>
                  {!showAddForm && (
                    <Button variant="outline" onClick={handleAddAddress}>
                      Ajouter une adresse
                    </Button>
                  )}
                </div>

                {showAddForm && (
                  <form onSubmit={handleSubmitAddress} className="mb-6 bg-neutral-support/30 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-text-dark mb-4">
                      {editingAddress ? 'Modifier l\'adresse' : 'Nouvelle adresse'}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-text-dark mb-2">
                          Libellé (ex: Domicile, Bureau) *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.label}
                          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                          placeholder="Domicile"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-text-dark mb-2">
                            Prénom *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-dark mb-2">
                            Nom *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-dark mb-2">
                          Adresse *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.street}
                          onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                          placeholder="Rue, numéro, quartier"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-text-dark mb-2">
                            Ville *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-dark mb-2">
                            Code postal
                          </label>
                          <input
                            type="text"
                            value={formData.postalCode}
                            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-text-dark mb-2">
                            Pays *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-dark mb-2">
                            Téléphone *
                          </label>
                          <input
                            type="tel"
                            required
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isDefault || false}
                            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                            className="text-primary"
                          />
                          <span>Définir comme adresse par défaut</span>
                        </label>
                      </div>
                      <div className="flex gap-4">
                        <Button type="submit" variant="primary" disabled={isLoadingAddresses}>
                          {editingAddress ? 'Enregistrer' : 'Ajouter'}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleCancelForm}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  </form>
                )}

                {addressesError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                    {addressesError}
                  </div>
                )}

                {isLoadingAddresses ? (
                  <div className="flex justify-center py-8">
                    <Loading />
                  </div>
                ) : addresses.length === 0 && !showAddForm ? (
                  <div className="text-center py-8">
                    <p className="text-text-dark/80 mb-4">
                      Vous n'avez pas encore enregistré d'adresse.
                    </p>
                    <Button variant="outline" onClick={handleAddAddress}>
                      Ajouter une adresse
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className="border-2 border-neutral-support rounded-lg p-4 hover:border-primary transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-text-dark">
                                {address.label}
                              </h3>
                              {address.isDefault && (
                                <span className="px-2 py-1 bg-primary text-white text-xs rounded-full">
                                  Par défaut
                                </span>
                              )}
                            </div>
                            <p className="text-text-dark/80 mb-1">
                              {address.firstName} {address.lastName}
                            </p>
                            <p className="text-text-dark/80 mb-1">{address.street}</p>
                            <p className="text-text-dark/80 mb-1">
                              {address.postalCode && `${address.postalCode} `}
                              {address.city}
                            </p>
                            <p className="text-text-dark/80 mb-1">{address.country}</p>
                            <p className="text-text-dark/80">Tél: {address.phone}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handleEditAddress(address)}
                              className="text-sm"
                            >
                              Modifier
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleDeleteAddress(address.id)}
                              className="text-sm text-red-600 hover:bg-red-50"
                            >
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

