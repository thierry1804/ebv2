import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { PromoCodeRefund, DatabasePromoCodeRefund } from '../types';
import toast from 'react-hot-toast';

export function usePromoCodeRefunds() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adaptDatabaseRefundToRefund = (
    dbRefund: DatabasePromoCodeRefund
  ): PromoCodeRefund => {
    return {
      id: dbRefund.id,
      orderId: dbRefund.order_id,
      promoCodeId: dbRefund.promo_code_id,
      userId: dbRefund.user_id || undefined,
      refundAmount: parseFloat(dbRefund.refund_amount.toString()),
      status: dbRefund.status,
      processedAt: dbRefund.processed_at || undefined,
      processedBy: dbRefund.processed_by || undefined,
      notes: dbRefund.notes || undefined,
      createdAt: dbRefund.created_at,
      updatedAt: dbRefund.updated_at,
    };
  };

  /**
   * Crée un remboursement en attente
   */
  const createRefund = async (
    orderId: string,
    promoCodeId: string,
    userId: string | null,
    refundAmount: number,
    notes?: string
  ): Promise<PromoCodeRefund | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('promo_code_refunds')
        .insert({
          order_id: orderId,
          promo_code_id: promoCodeId,
          user_id: userId,
          refund_amount: refundAmount,
          status: 'pending',
          notes: notes || null,
        })
        .select()
        .single();

      if (supabaseError) {
        console.error('Erreur lors de la création du remboursement:', supabaseError);
        setError(supabaseError.message || 'Erreur lors de la création du remboursement');
        toast.error('Erreur lors de la création du remboursement');
        return null;
      }

      const dbRefund = data as DatabasePromoCodeRefund;
      return adaptDatabaseRefundToRefund(dbRefund);
    } catch (err: any) {
      console.error('Erreur lors de la création du remboursement:', err);
      setError(err.message || 'Erreur lors de la création du remboursement');
      toast.error('Erreur lors de la création du remboursement');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Traite un remboursement (change le statut à "processed")
   */
  const processRefund = async (
    refundId: string,
    processedBy: string,
    notes?: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: supabaseError } = await supabase
        .from('promo_code_refunds')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
          processed_by: processedBy,
          notes: notes || null,
        })
        .eq('id', refundId);

      if (supabaseError) {
        console.error('Erreur lors du traitement du remboursement:', supabaseError);
        setError(supabaseError.message || 'Erreur lors du traitement du remboursement');
        toast.error('Erreur lors du traitement du remboursement');
        return false;
      }

      toast.success('Remboursement traité avec succès');
      return true;
    } catch (err: any) {
      console.error('Erreur lors du traitement du remboursement:', err);
      setError(err.message || 'Erreur lors du traitement du remboursement');
      toast.error('Erreur lors du traitement du remboursement');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Récupère les remboursements d'une commande
   */
  const getRefundsByOrder = async (orderId: string): Promise<PromoCodeRefund[]> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('promo_code_refunds')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (supabaseError) {
        console.error('Erreur lors de la récupération des remboursements:', supabaseError);
        setError(supabaseError.message || 'Erreur lors de la récupération des remboursements');
        return [];
      }

      return (data || []).map((dbRefund: DatabasePromoCodeRefund) =>
        adaptDatabaseRefundToRefund(dbRefund)
      );
    } catch (err: any) {
      console.error('Erreur lors de la récupération des remboursements:', err);
      setError(err.message || 'Erreur lors de la récupération des remboursements');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Annule un remboursement
   */
  const cancelRefund = async (refundId: string, notes?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: supabaseError } = await supabase
        .from('promo_code_refunds')
        .update({
          status: 'cancelled',
          notes: notes || null,
        })
        .eq('id', refundId);

      if (supabaseError) {
        console.error('Erreur lors de l\'annulation du remboursement:', supabaseError);
        setError(supabaseError.message || 'Erreur lors de l\'annulation du remboursement');
        toast.error('Erreur lors de l\'annulation du remboursement');
        return false;
      }

      toast.success('Remboursement annulé avec succès');
      return true;
    } catch (err: any) {
      console.error('Erreur lors de l\'annulation du remboursement:', err);
      setError(err.message || 'Erreur lors de l\'annulation du remboursement');
      toast.error('Erreur lors de l\'annulation du remboursement');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    createRefund,
    processRefund,
    getRefundsByOrder,
    cancelRefund,
  };
}
