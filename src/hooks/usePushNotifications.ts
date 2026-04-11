import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/** Convertit une clé base64url en Uint8Array (format attendu par pushManager.subscribe) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export type PushStatus = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed';

export function usePushNotifications(adminEmail: string | null) {
  const [status, setStatus] = useState<PushStatus>('loading');
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Initialisation : enregistrer le SW et vérifier l'état actuel
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    navigator.serviceWorker
      .register('/sw-push.js')
      .then(async (reg) => {
        setRegistration(reg);
        const sub = await reg.pushManager.getSubscription();
        setStatus(sub ? 'subscribed' : 'unsubscribed');
      })
      .catch(() => {
        setStatus('unsupported');
      });
  }, []);

  // S'abonner aux notifications push
  const subscribe = useCallback(async () => {
    if (!registration || !adminEmail || !VAPID_PUBLIC_KEY) return;

    try {
      // Demander la permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }

      // Créer l'abonnement push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = subscription.toJSON();

      // Sauvegarder dans Supabase
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_email: adminEmail,
          endpoint: subJson.endpoint!,
          keys_p256dh: subJson.keys!.p256dh!,
          keys_auth: subJson.keys!.auth!,
        },
        { onConflict: 'endpoint' }
      );

      if (error) throw error;
      setStatus('subscribed');
    } catch (err) {
      console.error('[Push] Erreur abonnement:', err);
      throw err;
    }
  }, [registration, adminEmail]);

  // Se désabonner
  const unsubscribe = useCallback(async () => {
    if (!registration) return;

    try {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        // Supprimer de Supabase
        await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      }
      setStatus('unsubscribed');
    } catch (err) {
      console.error('[Push] Erreur désabonnement:', err);
      throw err;
    }
  }, [registration]);

  return { status, subscribe, unsubscribe };
}
