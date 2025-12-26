import { useState } from 'react';
import { PromoCode, DatabasePromoCode, PromoCodeValidationResult } from '../types';
import { supabase } from '../lib/supabase';

export function usePromoCodes() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Valide un code promo et retourne le montant de la réduction
   */
  const validatePromoCode = async (
    code: string,
    userId: string | null,
    subtotal: number
  ): Promise<PromoCodeValidationResult> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!code || !code.trim()) {
        return {
          isValid: false,
          discountAmount: 0,
          errorMessage: 'Veuillez saisir un code promo',
        };
      }

      // Appeler la fonction PostgreSQL pour valider le code
      const { data, error: supabaseError } = await supabase.rpc('validate_promo_code', {
        p_code: code.toUpperCase().trim(),
        p_user_id: userId || null,
        p_subtotal: subtotal,
      });

      if (supabaseError) {
        console.error('Erreur lors de la validation du code promo:', supabaseError);
        setError(supabaseError.message || 'Erreur lors de la validation du code promo');
        return {
          isValid: false,
          discountAmount: 0,
          errorMessage: supabaseError.message || 'Erreur lors de la validation du code promo',
        };
      }

      if (!data || data.length === 0) {
        return {
          isValid: false,
          discountAmount: 0,
          errorMessage: 'Code promo invalide',
        };
      }

      const result = data[0];

      if (!result.is_valid) {
        return {
          isValid: false,
          discountAmount: 0,
          errorMessage: result.error_message || 'Code promo invalide',
        };
      }

      return {
        isValid: true,
        discountAmount: parseFloat(result.discount_amount) || 0,
        promoCodeId: result.promo_code_id,
        promoCodeType: result.promo_code_type,
        promoCodeValue: parseFloat(result.promo_code_value) || 0,
      };
    } catch (err: any) {
      console.error('Erreur lors de la validation du code promo:', err);
      setError(err.message || 'Erreur lors de la validation du code promo');
      return {
        isValid: false,
        discountAmount: 0,
        errorMessage: err.message || 'Erreur lors de la validation du code promo',
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Récupère les détails d'un code promo
   */
  const getPromoCode = async (code: string): Promise<PromoCode | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (supabaseError) {
        console.error('Erreur lors de la récupération du code promo:', supabaseError);
        setError(supabaseError.message || 'Erreur lors de la récupération du code promo');
        return null;
      }

      if (!data) {
        return null;
      }

      // Adapter les données de Supabase au format PromoCode
      const dbPromoCode = data as DatabasePromoCode;
      const promoCode: PromoCode = {
        id: dbPromoCode.id,
        code: dbPromoCode.code,
        type: dbPromoCode.type,
        value: parseFloat(dbPromoCode.value.toString()),
        validFrom: dbPromoCode.valid_from || undefined,
        validUntil: dbPromoCode.valid_until || undefined,
        usageLimitPerUser: dbPromoCode.usage_limit_per_user,
        minOrderAmount: dbPromoCode.min_order_amount ? parseFloat(dbPromoCode.min_order_amount.toString()) : undefined,
        isActive: dbPromoCode.is_active,
        description: dbPromoCode.description || undefined,
        createdAt: dbPromoCode.created_at,
        updatedAt: dbPromoCode.updated_at,
      };

      return promoCode;
    } catch (err: any) {
      console.error('Erreur lors de la récupération du code promo:', err);
      setError(err.message || 'Erreur lors de la récupération du code promo');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Enregistre l'utilisation d'un code promo
   */
  const recordPromoCodeUsage = async (
    promoCodeId: string,
    userId: string | null,
    orderId: string | null,
    discountAmount: number
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: supabaseError } = await supabase.from('promo_code_usage').insert({
        promo_code_id: promoCodeId,
        user_id: userId || null,
        order_id: orderId || null,
        discount_amount: discountAmount,
      });

      if (supabaseError) {
        console.error('Erreur lors de l\'enregistrement de l\'utilisation:', supabaseError);
        setError(supabaseError.message || 'Erreur lors de l\'enregistrement de l\'utilisation');
        return false;
      }

      return true;
    } catch (err: any) {
      console.error('Erreur lors de l\'enregistrement de l\'utilisation:', err);
      setError(err.message || 'Erreur lors de l\'enregistrement de l\'utilisation');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    validatePromoCode,
    getPromoCode,
    recordPromoCodeUsage,
    isLoading,
    error,
  };
}

