import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Eye, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { Order, DatabaseOrder, CartItem, Address } from '../../types';
import { formatPrice } from '../../utils/formatters';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement des commandes:', error);
        toast.error('Erreur lors du chargement des commandes');
        setOrders([]);
      } else {
        const adaptedOrders = (data || []).map((dbOrder: DatabaseOrder) => adaptDatabaseOrderToOrder(dbOrder));
        setOrders(adaptedOrders);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des commandes:', error);
      toast.error('Erreur lors du chargement des commandes');
    } finally {
      setIsLoading(false);
    }
  };

  const adaptDatabaseOrderToOrder = (dbOrder: DatabaseOrder): Order => {
    return {
      id: dbOrder.id,
      userId: dbOrder.user_id || '',
      items: dbOrder.items as CartItem[],
      shippingAddress: dbOrder.shipping_address as Address,
      paymentMethod: (dbOrder.payment_method as 'mobile_money' | 'cash_on_delivery') || 'cash_on_delivery',
      subtotal: parseFloat(dbOrder.subtotal.toString()),
      shipping: parseFloat(dbOrder.shipping.toString()),
      total: parseFloat(dbOrder.total.toString()),
      status: dbOrder.status,
      createdAt: dbOrder.created_at,
      orderNumber: dbOrder.order_number,
      promoCodeId: dbOrder.promo_code_id || undefined,
      promoDiscount: dbOrder.promo_discount ? parseFloat(dbOrder.promo_discount.toString()) : undefined,
    };
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Statut de la commande mis à jour');
      loadOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const getStatusBadgeClass = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'confirmed':
        return 'Confirmée';
      case 'shipped':
        return 'Expédiée';
      case 'delivered':
        return 'Livrée';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shippingAddress.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shippingAddress.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shippingAddress.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Chargement des commandes...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-heading font-bold text-text-dark">Commandes</h1>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher par numéro, nom, téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmée</option>
            <option value="shipped">Expédiée</option>
            <option value="delivered">Livrée</option>
            <option value="cancelled">Annulée</option>
          </select>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <Package className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500">
            {orders.length === 0
              ? 'Aucune commande trouvée.'
              : 'Aucune commande ne correspond à votre recherche'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-lg font-semibold text-text-dark">
                        Commande {order.orderNumber}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <strong>Date:</strong>{' '}
                        {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div>
                        <strong>Client:</strong> {order.shippingAddress.firstName}{' '}
                        {order.shippingAddress.lastName}
                      </div>
                      <div>
                        <strong>Téléphone:</strong> {order.shippingAddress.phone}
                      </div>
                      <div>
                        <strong>Paiement:</strong>{' '}
                        {order.paymentMethod === 'cash_on_delivery'
                          ? 'À la livraison'
                          : 'Mobile Money'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-text-dark">{formatPrice(order.total)}</p>
                      <p className="text-sm text-gray-600">
                        {order.items.length} article{order.items.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openOrderDetails(order)}
                      >
                        <Eye size={16} className="mr-2" />
                        Détails
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Articles (expandable) */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => toggleOrderExpansion(order.id)}
                    className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    <span>Articles de la commande</span>
                    {expandedOrders.has(order.id) ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </button>
                  {expandedOrders.has(order.id) && (
                    <div className="mt-4 space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                          <div className="w-12 h-12 rounded bg-gray-200 overflow-hidden">
                            <img
                              src={item.product.images[0]}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-text-dark">{item.product.name}</p>
                            <p className="text-xs text-gray-600">
                              {item.size && `${item.size}`}
                              {item.size && item.color && ' • '}
                              {item.color && `${item.color}`}
                              {(item.size || item.color) && ' • '}
                              Quantité: {item.quantity}
                            </p>
                          </div>
                          <p className="font-semibold text-text-dark">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions rapides */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {order.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'confirmed')}
                      >
                        Marquer comme confirmée
                      </Button>
                    )}
                    {order.status === 'confirmed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'shipped')}
                      >
                        Marquer comme expédiée
                      </Button>
                    )}
                    {order.status === 'shipped' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'delivered')}
                      >
                        Marquer comme livrée
                      </Button>
                    )}
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) {
                            updateOrderStatus(order.id, 'cancelled');
                          }
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        Annuler
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de détails */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Détails de la commande">
        {selectedOrder && (
          <div className="space-y-6">
            {/* Informations générales */}
            <div>
              <h3 className="font-semibold text-text-dark mb-3">Informations générales</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong className="text-gray-600">Numéro de commande:</strong>
                  <p className="text-text-dark">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <strong className="text-gray-600">Date:</strong>
                  <p className="text-text-dark">
                    {new Date(selectedOrder.createdAt).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <strong className="text-gray-600">Statut:</strong>
                  <p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(
                        selectedOrder.status
                      )}`}
                    >
                      {getStatusLabel(selectedOrder.status)}
                    </span>
                  </p>
                </div>
                <div>
                  <strong className="text-gray-600">Méthode de paiement:</strong>
                  <p className="text-text-dark">
                    {selectedOrder.paymentMethod === 'cash_on_delivery'
                      ? 'À la livraison'
                      : 'Mobile Money'}
                  </p>
                </div>
              </div>
            </div>

            {/* Adresse de livraison */}
            <div>
              <h3 className="font-semibold text-text-dark mb-3">Adresse de livraison</h3>
              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <p className="font-medium text-text-dark">
                  {selectedOrder.shippingAddress.firstName} {selectedOrder.shippingAddress.lastName}
                </p>
                <p className="text-gray-600">{selectedOrder.shippingAddress.street}</p>
                <p className="text-gray-600">
                  {selectedOrder.shippingAddress.postalCode} {selectedOrder.shippingAddress.city}
                </p>
                <p className="text-gray-600">{selectedOrder.shippingAddress.country}</p>
                <p className="text-gray-600 mt-2">
                  <strong>Téléphone:</strong> {selectedOrder.shippingAddress.phone}
                </p>
              </div>
            </div>

            {/* Articles */}
            <div>
              <h3 className="font-semibold text-text-dark mb-3">Articles</h3>
              <div className="space-y-3">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-16 h-16 rounded bg-gray-200 overflow-hidden">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-text-dark">{item.product.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.size && `Taille: ${item.size}`}
                        {item.size && item.color && ' • '}
                        {item.color && `Couleur: ${item.color}`}
                      </p>
                      <p className="text-sm text-gray-600">Quantité: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-text-dark">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatPrice(item.price)} / unité
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Résumé financier */}
            <div>
              <h3 className="font-semibold text-text-dark mb-3">Résumé</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sous-total:</span>
                  <span className="text-text-dark">{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.promoDiscount && selectedOrder.promoDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Réduction:</span>
                    <span>-{formatPrice(selectedOrder.promoDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Livraison:</span>
                  <span className="text-text-dark">
                    {selectedOrder.shipping === 0 ? (
                      <span className="text-green-600 font-semibold">Gratuite</span>
                    ) : (
                      formatPrice(selectedOrder.shipping)
                    )}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-300 font-bold text-lg">
                  <span className="text-text-dark">Total:</span>
                  <span className="text-text-dark">{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              {selectedOrder.status === 'pending' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    updateOrderStatus(selectedOrder.id, 'confirmed');
                  }}
                >
                  Marquer comme confirmée
                </Button>
              )}
              {selectedOrder.status === 'confirmed' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    updateOrderStatus(selectedOrder.id, 'shipped');
                  }}
                >
                  Marquer comme expédiée
                </Button>
              )}
              {selectedOrder.status === 'shipped' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    updateOrderStatus(selectedOrder.id, 'delivered');
                  }}
                >
                  Marquer comme livrée
                </Button>
              )}
              {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) {
                      updateOrderStatus(selectedOrder.id, 'cancelled');
                    }
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  Annuler la commande
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

