import { useState } from 'react';
import { Order, DatabaseOrder, CartItem, Address } from '../types';
import { supabase } from '../lib/supabase';

export function useOrders() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Convertit une commande du format base de données vers le format frontend
   */
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

  /**
   * Crée une commande dans Supabase
   */
  const createOrder = async (
    userId: string | null,
    items: CartItem[],
    shippingAddress: Address,
    paymentMethod: 'mobile_money' | 'cash_on_delivery',
    subtotal: number,
    shipping: number,
    total: number,
    orderNumber: string,
    promoCodeId?: string | null,
    promoDiscount?: number
  ): Promise<Order | null> => {
    try {
      setIsLoading(true);
      setError(null);

      // Préparer les données pour Supabase
      const orderData = {
        user_id: userId,
        order_number: orderNumber,
        status: 'pending' as const,
        subtotal: subtotal,
        shipping: shipping,
        total: total,
        payment_method: paymentMethod,
        shipping_address: shippingAddress,
        items: items,
        promo_code_id: promoCodeId || null,
        promo_discount: promoDiscount || null,
      };

      const { data, error: supabaseError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (supabaseError) {
        console.error('Erreur lors de la création de la commande:', supabaseError);
        setError(supabaseError.message || 'Erreur lors de la création de la commande');
        return null;
      }

      if (!data) {
        setError('Aucune donnée retournée lors de la création de la commande');
        return null;
      }

      return adaptDatabaseOrderToOrder(data as DatabaseOrder);
    } catch (err: any) {
      console.error('Erreur lors de la création de la commande:', err);
      setError(err.message || 'Erreur lors de la création de la commande');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Récupère toutes les commandes d'un utilisateur
   */
  const getUserOrders = async (userId: string): Promise<Order[]> => {
    try {
      setIsLoading(true);
      setError(null);

      // Valider que l'ID est un UUID valide
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.error('ID utilisateur invalide (pas un UUID):', userId);
        setError('ID utilisateur invalide');
        return [];
      }

      const { data, error: supabaseError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (supabaseError) {
        console.error('Erreur lors de la récupération des commandes:', supabaseError);
        setError(supabaseError.message || 'Erreur lors de la récupération des commandes');
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((dbOrder) => adaptDatabaseOrderToOrder(dbOrder as DatabaseOrder));
    } catch (err: any) {
      console.error('Erreur lors de la récupération des commandes:', err);
      setError(err.message || 'Erreur lors de la récupération des commandes');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Récupère une commande spécifique par ID
   */
  const getOrder = async (orderId: string): Promise<Order | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (supabaseError) {
        console.error('Erreur lors de la récupération de la commande:', supabaseError);
        setError(supabaseError.message || 'Erreur lors de la récupération de la commande');
        return null;
      }

      if (!data) {
        return null;
      }

      return adaptDatabaseOrderToOrder(data as DatabaseOrder);
    } catch (err: any) {
      console.error('Erreur lors de la récupération de la commande:', err);
      setError(err.message || 'Erreur lors de la récupération de la commande');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createOrder,
    getUserOrders,
    getOrder,
    isLoading,
    error,
  };
}

