import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Category } from '../types';

interface DatabaseCategory {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (supabaseError) {
        console.warn('Erreur lors du chargement des catégories:', supabaseError);
        // Utiliser les catégories par défaut si Supabase n'est pas disponible
        setCategories(getDefaultCategories());
        setError('Impossible de charger les catégories depuis Supabase');
      } else {
        const adaptedCategories = (data || []).map((c: DatabaseCategory) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          image: c.image || undefined,
          description: c.description || undefined,
        }));
        setCategories(adaptedCategories);
        setError(null);
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des catégories:', err);
      setCategories(getDefaultCategories());
      setError(err.message || 'Erreur lors du chargement des catégories');
    } finally {
      setIsLoading(false);
    }
  };

  return { categories, isLoading, error, reload: loadCategories };
}

// Catégories par défaut en cas d'erreur
function getDefaultCategories(): Category[] {
  return [
    { id: '1', name: 'Vêtements', slug: 'vetements', image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400' },
    { id: '2', name: 'Accessoires', slug: 'accessoires', image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400' },
    { id: '3', name: 'Chaussures', slug: 'chaussures', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400' },
    { id: '4', name: 'Sacs', slug: 'sacs', image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400' },
    { id: '5', name: 'Bijoux', slug: 'bijoux', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400' },
    { id: '6', name: 'Soldes', slug: 'soldes', image: 'https://images.unsplash.com/photo-1594633312682-6ea69c1dcc64?w=400' },
  ];
}

