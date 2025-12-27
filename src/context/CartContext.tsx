import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { CartItem, Product } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, size: string | null, color: string | null, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getTotal: (shipping?: number) => number;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'eshop_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousUserIdRef = useRef<string | null>(null);

  // Sauvegarder le panier en base de données
  const saveCartToDatabase = useCallback(async (cartItems: CartItem[]) => {
    if (!isAuthenticated || !user?.id) return;

    try {
      const { error } = await supabase
        .from('user_cart')
        .upsert({
          user_id: user.id,
          items: cartItems,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Erreur lors de la sauvegarde du panier:', error);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du panier:', error);
    }
  }, [isAuthenticated, user?.id]);

  // Vider le panier lors de la déconnexion ou changement d'utilisateur
  useEffect(() => {
    if (isInitialized.current) {
      const currentUserId = user?.id || null;
      
      // Si on passe d'un utilisateur connecté à déconnecté, ou changement d'utilisateur
      if (previousUserIdRef.current !== null && currentUserId === null) {
        // Déconnexion : vider le panier
        setItems([]);
        isInitialized.current = false;
      } else if (previousUserIdRef.current !== currentUserId && previousUserIdRef.current !== null) {
        // Changement d'utilisateur : vider le panier
        setItems([]);
        isInitialized.current = false;
      }
      
      previousUserIdRef.current = currentUserId;
    }
  }, [isAuthenticated, user?.id]);

  // Charger le panier depuis localStorage ou Supabase
  useEffect(() => {
    const loadCart = async () => {
      setIsLoading(true);

      try {
        if (isAuthenticated && user?.id) {
          // Charger depuis Supabase
          const { data, error } = await supabase
            .from('user_cart')
            .select('items')
            .eq('user_id', user.id)
            .maybeSingle();

          // Gérer les erreurs (PGRST116 = pas de résultat, c'est normal)
          if (error) {
            if (error.code === 'PGRST116') {
              // Pas de panier en base, c'est normal pour un nouvel utilisateur
              console.log('Aucun panier trouvé en base pour cet utilisateur');
            } else {
              console.error('Erreur lors du chargement du panier:', error);
            }
          }

          if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
            setItems(data.items as CartItem[]);
            // Synchroniser avec localStorage (avec clé spécifique à l'utilisateur)
            localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(data.items));
          } else {
            // Si pas de panier en base, vérifier localStorage et fusionner
            const localCart = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
            if (localCart) {
              const localItems = JSON.parse(localCart) as CartItem[];
              if (localItems.length > 0) {
                // Sauvegarder le panier local en base
                await saveCartToDatabase(localItems);
                setItems(localItems);
              } else {
                setItems([]);
              }
            } else {
              setItems([]);
            }
          }
        } else {
          // Utilisateur non connecté : utiliser localStorage générique
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            setItems(JSON.parse(stored));
          } else {
            setItems([]);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement du panier:', error);
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

    loadCart();
  }, [isAuthenticated, user?.id, saveCartToDatabase]);

  // Sauvegarder automatiquement (avec debounce)
  useEffect(() => {
    if (!isInitialized.current) return;

    // Sauvegarder dans localStorage (avec clé spécifique si connecté)
    if (isAuthenticated && user?.id) {
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(items));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }

    // Sauvegarder en base (avec debounce de 500ms)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (isAuthenticated && user?.id) {
        saveCartToDatabase(items);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [items, isAuthenticated, user?.id]);

  const addItem = (product: Product, size: string | null, color: string | null, quantity = 1) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find(
        (item) =>
          item.productId === product.id &&
          item.size === size &&
          item.color === color
      );

      if (existingItem) {
        return prevItems.map((item) =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      const sizePart = size || 'none';
      const colorPart = color || 'none';
      const newItem: CartItem = {
        id: `${product.id}-${sizePart}-${colorPart}-${Date.now()}`,
        productId: product.id,
        product,
        size,
        color,
        quantity,
        price: product.salePrice || product.price,
      };

      return [...prevItems, newItem];
    });
  };

  const removeItem = (itemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getSubtotal = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getTotal = (shipping = 0) => {
    return getSubtotal() + shipping;
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotalItems,
        getSubtotal,
        getTotal,
        isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

