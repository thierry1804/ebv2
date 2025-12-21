import { useState, useEffect, useMemo } from 'react';
import { Product } from '../types';
import { supabase } from '../lib/supabase';
import { useCategories } from './useCategories';
import { getColorHex } from '../config/colors';

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
        const adaptedProducts = (data || []).map((p: any) => {
          // Gérer les couleurs : peut être string[] (ancien format) ou ColorWithHex[] (nouveau format)
          let colors = [];
          if (p.colors) {
            // Si c'est une chaîne JSON, la parser
            let parsedColors = p.colors;
            if (typeof p.colors === 'string') {
              try {
                parsedColors = JSON.parse(p.colors);
              } catch (e) {
                // Si ce n'est pas du JSON valide, traiter comme une liste séparée par des virgules
                parsedColors = p.colors.split(',').map((c: string) => c.trim()).filter(Boolean);
              }
            }
            
            if (Array.isArray(parsedColors) && parsedColors.length > 0) {
              // Si le premier élément est un objet avec name et hex, c'est le nouveau format
              const firstColor = parsedColors[0];
              if (firstColor && typeof firstColor === 'object' && firstColor !== null && 
                  'name' in firstColor && 'hex' in firstColor) {
                // Nouveau format : ColorWithHex[]
                colors = parsedColors.map((c: any) => ({
                  name: c.name || 'Couleur inconnue',
                  hex: (c.hex && /^#[0-9A-F]{6}$/i.test(c.hex)) ? c.hex.toUpperCase() : '#CCCCCC'
                }));
              } else if (typeof firstColor === 'string') {
                // Vérifier si c'est une chaîne JSON
                try {
                  const parsed = JSON.parse(firstColor);
                  if (parsed && typeof parsed === 'object' && parsed.name && parsed.hex) {
                    // C'est un tableau de chaînes JSON
                    colors = parsedColors.map((c: string) => {
                      try {
                        const parsed = JSON.parse(c);
                        return {
                          name: parsed.name || 'Couleur inconnue',
                          hex: (parsed.hex && /^#[0-9A-F]{6}$/i.test(parsed.hex)) ? parsed.hex.toUpperCase() : '#CCCCCC'
                        };
                      } catch (e) {
                        return {
                          name: c,
                          hex: getColorHex(c)
                        };
                      }
                    });
                  } else {
                    // Ancien format : tableau de strings simples
                    colors = parsedColors;
                  }
                } catch (e) {
                  // Ancien format : tableau de strings simples
                  colors = parsedColors;
                }
              }
            }
          }
          
          return {
            id: p.id,
            name: p.name,
            category: p.category,
            price: parseFloat(p.price) || 0,
            images: Array.isArray(p.images) ? p.images : p.image ? [p.image] : [],
            sizes: Array.isArray(p.sizes) ? p.sizes : [],
            colors: colors,
            description: p.description || '',
            composition: p.composition || '',
            stock: p.stock || 0,
            rating: parseFloat(p.rating) || 0,
            reviewCount: p.review_count || 0,
            isNew: p.is_new || false,
            isOnSale: p.is_on_sale || false,
            salePrice: p.sale_price ? parseFloat(p.sale_price) : undefined,
            brand: p.brand || undefined,
          };
        });
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

