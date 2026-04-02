import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { SiteSettings } from '../../types';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { PageLoading } from '../../components/ui/PageLoading';
import { DEFAULT_MAINTENANCE_MESSAGE } from '../../hooks/useMaintenanceSettings';
import { Save } from 'lucide-react';

export default function AdminSiteSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 'global')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setMaintenanceEnabled(Boolean((data as SiteSettings).maintenance_enabled));
        setMaintenanceMessage((data as SiteSettings).maintenance_message ?? '');
      }
    } catch (e: unknown) {
      console.error(e);
      toast.error(
        'Impossible de charger les paramètres. Vérifiez que la table site_settings existe (voir SITE_SETTINGS.sql).'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        id: 'global' as const,
        maintenance_enabled: maintenanceEnabled,
        maintenance_message: maintenanceMessage.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('site_settings').upsert(payload, {
        onConflict: 'id',
      });

      if (error) throw error;
      toast.success('Paramètres enregistrés');
    } catch (e: unknown) {
      console.error(e);
      toast.error('Erreur lors de l’enregistrement');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-heading font-semibold text-text-dark mb-1">
          Maintenance du site
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Lorsque la maintenance est activée, les visiteurs voient une page dédiée. Le backoffice (
          <span className="font-mono text-xs">/admin</span>) reste accessible.
        </p>

        <label className="flex items-center gap-3 cursor-pointer mb-6">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary"
            checked={maintenanceEnabled}
            onChange={(e) => setMaintenanceEnabled(e.target.checked)}
          />
          <span className="text-sm font-medium text-text-dark">Activer la page de maintenance</span>
        </label>

        <div className="mb-6">
          <label htmlFor="maintenance-msg" className="block text-sm font-medium text-text-dark mb-2">
            Message affiché aux visiteurs
          </label>
          <textarea
            id="maintenance-msg"
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-secondary focus:border-secondary"
            placeholder={DEFAULT_MAINTENANCE_MESSAGE}
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Laisser vide pour utiliser le message par défaut.
          </p>
        </div>

        <Button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2">
          <Save size={18} />
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
