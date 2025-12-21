import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// ID de mesure Google Analytics (GA4)
// Remplacez par votre propre ID de mesure
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';

// Initialiser Google Analytics
export function useGoogleAnalytics() {
  const location = useLocation();

  useEffect(() => {
    // Charger le script Google Analytics si l'ID est configuré
    if (GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
      // Charger gtag.js
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script1);

      // Initialiser gtag
      window.dataLayer = window.dataLayer || [];
      function gtag(...args: any[]) {
        window.dataLayer.push(args);
      }
      (window as any).gtag = gtag;

      gtag('js', new Date());
      gtag('config', GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search,
      });
    }
  }, []);

  // Suivre les changements de page
  useEffect(() => {
    if (GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX' && (window as any).gtag) {
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

