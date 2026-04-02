import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const DEFAULT_MAINTENANCE_MESSAGE =
  'Le site est temporairement indisponible. Merci de revenir plus tard.';

export function useMaintenanceSettings() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('maintenance_enabled, maintenance_message')
          .eq('id', 'global')
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          console.warn('site_settings:', error.message);
          setEnabled(false);
          setMessage(null);
        } else {
          setEnabled(Boolean(data?.maintenance_enabled));
          setMessage(data?.maintenance_message ?? null);
        }
      } catch {
        if (!cancelled) {
          setEnabled(false);
          setMessage(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayMessage = message?.trim() || DEFAULT_MAINTENANCE_MESSAGE;

  return { enabled, message: displayMessage, loading };
}
