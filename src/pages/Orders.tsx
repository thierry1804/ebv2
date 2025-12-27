import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../hooks/useOrders';
import { Button } from '../components/ui/Button';
import { Loading } from '../components/ui/Loading';
import { formatPrice } from '../utils/formatters';
import { Order } from '../types';
import { Link, useNavigate } from 'react-router-dom';

export default function Orders() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { getUserOrders, isLoading: isLoadingOrders, error: ordersError } = useOrders();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasLoadedOrders, setHasLoadedOrders] = useState(false);

  useEffect(() => {
    // Attendre que l'authentification soit chargée avant de vérifier
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/connexion');
      return;
    }

    if (user?.id) {
      loadOrders();
    }
  }, [user?.id, isAuthenticated, authLoading, navigate]);

  const loadOrders = async () => {
    if (!user?.id) {
      setOrders([]);
      setHasLoadedOrders(true);
      return;
    }
    
    // Valider que l'ID est un UUID valide avant de faire la requête
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user.id)) {
      console.error('ID utilisateur invalide (pas un UUID):', user.id);
      setOrders([]);
      setHasLoadedOrders(true);
      return;
    }
    
    try {
      const userOrders = await getUserOrders(user.id);
      setOrders(userOrders || []);
      setHasLoadedOrders(true);
    } catch (error) {
      console.error('Erreur lors du chargement des commandes:', error);
      setOrders([]);
      setHasLoadedOrders(true);
    }
  };

  // Afficher un loader pendant le chargement de l'authentification
  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center py-8">
          <Loading />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Le navigate va rediriger
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to="/compte"
          className="text-primary hover:text-secondary transition-colors inline-flex items-center gap-2 mb-4"
        >
          ← Retour à mon compte
        </Link>
        <h1 className="text-3xl font-heading font-bold text-text-dark">Mes commandes</h1>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm">
        {isLoadingOrders || !hasLoadedOrders ? (
          <div className="flex justify-center py-8">
            <Loading />
          </div>
        ) : ordersError ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">
              Erreur lors du chargement des commandes: {ordersError}
            </p>
            <Button variant="outline" onClick={loadOrders}>
              Réessayer
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-dark/80 text-lg mb-4">
              Vous n'avez pas encore passé de commande.
            </p>
            <Link to="/boutique">
              <Button variant="primary">Découvrir nos produits</Button>
            </Link>
          </div>
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
                              loading="lazy"
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
    </div>
  );
}

