import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { Product } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  items: Product[];
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: Product) => void;
  isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const STORAGE_KEY = 'eshop_wishlist';

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sauvegarder la wishlist en base de données
  const saveWishlistToDatabase = useCallback(async (wishlistItems: Product[]) => {
    if (!isAuthenticated || !user?.id) return;

    try {
      const { error } = await supabase
        .from('user_wishlist')
        .upsert({
          user_id: user.id,
          items: wishlistItems,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Erreur lors de la sauvegarde de la wishlist:', error);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la wishlist:', error);
    }
  }, [isAuthenticated, user?.id]);

  // Charger la wishlist depuis localStorage ou Supabase
  useEffect(() => {
    const loadWishlist = async () => {
      setIsLoading(true);

      try {
        if (isAuthenticated && user?.id) {
          // Charger depuis Supabase
          const { data, error } = await supabase
            .from('user_wishlist')
            .select('items')
            .eq('user_id', user.id)
            .maybeSingle();

          // Gérer les erreurs (PGRST116 = pas de résultat, c'est normal)
          if (error) {
            if (error.code === 'PGRST116') {
              // Pas de wishlist en base, c'est normal pour un nouvel utilisateur
              console.log('Aucune wishlist trouvée en base pour cet utilisateur');
            } else {
              console.error('Erreur lors du chargement de la wishlist:', error);
            }
          }

          if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
            setItems(data.items as Product[]);
            // Synchroniser avec localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.items));
          } else {
            // Si pas de wishlist en base, vérifier localStorage et fusionner
            const localWishlist = localStorage.getItem(STORAGE_KEY);
            if (localWishlist) {
              const localItems = JSON.parse(localWishlist) as Product[];
              if (localItems.length > 0) {
                // Sauvegarder la wishlist locale en base
                await saveWishlistToDatabase(localItems);
                setItems(localItems);
              } else {
                setItems([]);
              }
            } else {
              setItems([]);
            }
          }
        } else {
          // Charger depuis localStorage
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            setItems(JSON.parse(stored));
          } else {
            setItems([]);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la wishlist:', error);
        // Fallback sur localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setItems(JSON.parse(stored));
        } else {
          setItems([]);
        }
      } finally {
        setIsLoading(false);
        isInitialized.current = true;
      }
    };

    loadWishlist();
  }, [isAuthenticated, user?.id, saveWishlistToDatabase]);

  // Sauvegarder automatiquement (avec debounce)
  useEffect(() => {
    if (!isInitialized.current) return;

    // Sauvegarder dans localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

    // Sauvegarder en base (avec debounce de 500ms)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (isAuthenticated && user?.id) {
        saveWishlistToDatabase(items);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [items, isAuthenticated, user?.id]);

  const addToWishlist = (product: Product) => {
    setItems((prevItems) => {
      if (prevItems.find((item) => item.id === product.id)) {
        return prevItems;
      }
      return [...prevItems, product];
    });
  };

  const removeFromWishlist = (productId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== productId));
  };

  const isInWishlist = (productId: string) => {
    return items.some((item) => item.id === productId);
  };

  const toggleWishlist = (product: Product) => {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        items,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        toggleWishlist,
        isLoading,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}

