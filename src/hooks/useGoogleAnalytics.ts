import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// ID de mesure Google Analytics (GA4)
// Le script est chargé dans index.html, on utilise l'ID ici pour le suivi des pages
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-1D5HC9RGEZ';

// Initialiser Google Analytics - Le script est déjà chargé dans index.html
// Ce hook gère uniquement le suivi des changements de page pour les SPAs
export function useGoogleAnalytics() {
  const location = useLocation();

  // Suivre les changements de page (pour les Single Page Applications)
  useEffect(() => {
    // Attendre que gtag soit disponible (chargé depuis index.html)
    if ((window as any).gtag && GA_MEASUREMENT_ID) {
      (window as any).gtag('config', GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search,
        page_title: document.title,
      });
    }
  }, [location]);
}

// Fonctions utilitaires pour envoyer des événements
export const trackEvent = (
  eventName: string,
  eventParams?: {
    action?: string;
    category?: string;
    label?: string;
    value?: number;
    [key: string]: any;
  }
) => {
  if ((window as any).gtag) {
    (window as any).gtag('event', eventName, eventParams);
  }
};

// Événements prédéfinis pour l'e-commerce
export const analytics = {
  // Suivre les vues de produits
  viewProduct: (productId: string, productName: string, price: number) => {
    trackEvent('view_item', {
      currency: 'MGA',
      value: price,
      items: [
        {
          item_id: productId,
          item_name: productName,
          price: price,
          currency: 'MGA',
        },
      ],
    });
  },

  // Suivre l'ajout au panier
  addToCart: (productId: string, productName: string, price: number, quantity: number = 1) => {
    trackEvent('add_to_cart', {
      currency: 'MGA',
      value: price * quantity,
      items: [
        {
          item_id: productId,
          item_name: productName,
          price: price,
          quantity: quantity,
          currency: 'MGA',
        },
      ],
    });
  },

  // Suivre le début du checkout
  beginCheckout: (value: number, items: any[]) => {
    trackEvent('begin_checkout', {
      currency: 'MGA',
      value: value,
      items: items,
    });
  },

  // Suivre les achats
  purchase: (transactionId: string, value: number, items: any[]) => {
    trackEvent('purchase', {
      transaction_id: transactionId,
      currency: 'MGA',
      value: value,
      items: items,
    });
  },

  // Suivre les recherches
  search: (searchTerm: string) => {
    trackEvent('search', {
      search_term: searchTerm,
    });
  },

  // Suivre les clics sur les produits
  selectItem: (productId: string, productName: string) => {
    trackEvent('select_item', {
      items: [
        {
          item_id: productId,
          item_name: productName,
        },
      ],
    });
  },
};

