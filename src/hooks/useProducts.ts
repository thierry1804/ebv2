import { useState, useEffect, useMemo } from 'react';
import { Product } from '../types';
import { supabase } from '../lib/supabase';
import { useCategories } from './useCategories';

export function useProducts() {
  const { categories, isLoading: categoriesLoading } = useCategories();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (supabaseError) {
        console.error('Erreur lors du chargement des produits:', supabaseError);
        setError(supabaseError.message || 'Erreur lors du chargement des produits');
        setProducts([]);
      } else {
        // Adapter les données de Supabase au format Product
        const adaptedProducts = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: parseFloat(p.price) || 0,
          images: Array.isArray(p.images) ? p.images : p.image ? [p.image] : [],
          sizes: Array.isArray(p.sizes) ? p.sizes : [],
          colors: Array.isArray(p.colors) ? p.colors : [],
          description: p.description || '',
          composition: p.composition || '',
          stock: p.stock || 0,
          rating: parseFloat(p.rating) || 0,
          reviewCount: p.review_count || 0,
          isNew: p.is_new || false,
          isOnSale: p.is_on_sale || false,
          salePrice: p.sale_price ? parseFloat(p.sale_price) : undefined,
          brand: p.brand || undefined,
        }));
        setProducts(adaptedProducts);
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des produits:', err);
      setError(err.message || 'Erreur lors du chargement des produits');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Obtenir la liste des noms de catégories actives
  const activeCategoryNames = useMemo(() => {
    return new Set(categories.map((c) => c.name));
  }, [categories]);

  // Filtrer les produits selon les catégories actives
  const filteredProducts = useMemo(() => {
    // Filtrer uniquement les produits dont la catégorie est active
    return products.filter((product) => {
      return activeCategoryNames.has(product.category);
    });
  }, [products, activeCategoryNames]);

  return {
    products: filteredProducts,
    isLoading: isLoading || categoriesLoading,
    error,
    reload: loadProducts,
  };
}

