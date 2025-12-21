import { useState } from 'react';
import { Review } from '../types';
import { supabase } from '../lib/supabase';

interface DatabaseReview {
  id: string;
  product_id: string;
  user_name: string;
  rating: number;
  comment: string;
  images?: string[];
  created_at: string;
  updated_at: string;
}

export function useReviews() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getReviews = async (productId: string): Promise<Review[]> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (supabaseError) {
        console.error('Erreur lors du chargement des avis:', supabaseError);
        setError(supabaseError.message || 'Erreur lors du chargement des avis');
        return [];
      }

      // Adapter les données de Supabase au format Review
      const reviews: Review[] = (data || []).map((r: DatabaseReview) => ({
        id: r.id,
        productId: r.product_id,
        userId: '', // Pas d'authentification, donc pas de userId
        userName: r.user_name,
        rating: r.rating,
        comment: r.comment,
        images: Array.isArray(r.images) ? r.images : [],
        createdAt: r.created_at,
      }));

      return reviews;
    } catch (err: any) {
      console.error('Erreur lors du chargement des avis:', err);
      setError(err.message || 'Erreur lors du chargement des avis');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const submitReview = async (
    productId: string,
    userName: string,
    rating: number,
    comment: string
  ): Promise<Review | null> => {
    try {
      setIsLoading(true);
      setError(null);

      // Validation
      if (!userName.trim()) {
        throw new Error('Le nom est requis');
      }
      if (rating < 1 || rating > 5) {
        throw new Error('La note doit être entre 1 et 5');
      }
      if (!comment.trim()) {
        throw new Error('Le commentaire est requis');
      }
      if (comment.trim().length < 10) {
        throw new Error('Le commentaire doit contenir au moins 10 caractères');
      }
      if (comment.trim().length > 1000) {
        throw new Error('Le commentaire ne peut pas dépasser 1000 caractères');
      }

      const { data, error: supabaseError } = await supabase
        .from('reviews')
        .insert({
          product_id: productId,
          user_name: userName.trim(),
          rating: rating,
          comment: comment.trim(),
          images: [],
        })
        .select()
        .single();

      if (supabaseError) {
        console.error('Erreur lors de la soumission de l\'avis:', supabaseError);
        setError(supabaseError.message || 'Erreur lors de la soumission de l\'avis');
        return null;
      }

      // Adapter les données au format Review
      const review: Review = {
        id: data.id,
        productId: data.product_id,
        userId: '',
        userName: data.user_name,
        rating: data.rating,
        comment: data.comment,
        images: Array.isArray(data.images) ? data.images : [],
        createdAt: data.created_at,
      };

      return review;
    } catch (err: any) {
      console.error('Erreur lors de la soumission de l\'avis:', err);
      setError(err.message || 'Erreur lors de la soumission de l\'avis');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getReviews,
    submitReview,
    isLoading,
    error,
  };
}

