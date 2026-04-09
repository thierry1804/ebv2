import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { SiteSettings } from '../../types';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { PageLoading } from '../../components/ui/PageLoading';
import { DEFAULT_MAINTENANCE_MESSAGE } from '../../hooks/useMaintenanceSettings';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  buildClientContext,
  insertSiteSettingsAudit,
  type SiteSettingsAuditLogRow,
} from '../../lib/siteSettingsAudit';
import { ChevronDown, ChevronRight, RefreshCw, Save } from 'lucide-react';
import { cn } from '../../utils/cn';

const AUDIT_PAGE_SIZE = 100;

export default function AdminSiteSettings() {
  const { adminUser } = useAdminAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [auditLogs, setAuditLogs] = useState<SiteSettingsAuditLogRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const consultationLoggedRef = useRef(false);

  const actorEmail = adminUser?.email ?? 'inconnu@local';
  const actorId = adminUser?.id ?? null;

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_settings_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(AUDIT_PAGE_SIZE);

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('[AdminSiteSettings] Table site_settings_audit_log absente — exécuter SITE_SETTINGS_AUDIT_LOG.sql');
        } else {
          console.error(error);
        }
        setAuditLogs([]);
        return;
      }
      setAuditLogs((data ?? []) as SiteSettingsAuditLogRow[]);
    } catch (e) {
      console.error(e);
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
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

  useEffect(() => {
    void loadSettings();
  }, []);

  useEffect(() => {
    void loadAuditLogs();
  }, [loadAuditLogs]);

  /** Consultation de la page : trace exhaustive (qui, quand, quoi, comment côté client). */
  useEffect(() => {
    if (!adminUser || isLoading || consultationLoggedRef.current) return;
    consultationLoggedRef.current = true;
    void (async () => {
      const { error } = await insertSiteSettingsAudit(supabase, {
        actorUserId: actorId,
        actorEmail,
        action: 'site_settings.consultation',
        summary: 'Ouverture / consultation de la page Paramètres site',
        details: {
          comment: 'Chargement de l’interface d’administration des paramètres globaux (maintenance).',
          how: {
            route: '/admin/parametres-site',
            hook: 'useEffect après chargement des paramètres',
          },
          client: buildClientContext(),
        },
      });
      if (error) console.warn('[audit] consultation:', error.message);
      void loadAuditLogs();
    })();
  }, [adminUser, isLoading, actorId, actorEmail, loadAuditLogs]);

  const handleSave = async () => {
    setSaving(true);
    let rowBefore: SiteSettings | null = null;
    try {
      const { data: beforeData, error: fetchErr } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 'global')
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      rowBefore = beforeData as SiteSettings | null;

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

      const diff = {
        maintenance_enabled: {
          avant: rowBefore?.maintenance_enabled ?? null,
          après: payload.maintenance_enabled,
          modifié:
            Boolean(rowBefore?.maintenance_enabled) !== Boolean(payload.maintenance_enabled),
        },
        maintenance_message: {
          avant: rowBefore?.maintenance_message ?? null,
          après: payload.maintenance_message,
          modifié:
            (rowBefore?.maintenance_message ?? '').trim() !==
            (payload.maintenance_message ?? '').trim(),
        },
        updated_at: { avant: rowBefore?.updated_at ?? null, après: payload.updated_at },
      };

      await insertSiteSettingsAudit(supabase, {
        actorUserId: actorId,
        actorEmail,
        action: 'site_settings.save',
        summary: `Enregistrement des paramètres : maintenance ${payload.maintenance_enabled ? 'activée' : 'désactivée'}`,
        details: {
          comment:
            'Écriture Supabase sur la ligne id=global (upsert), avec comparaison avant/après pour la traçabilité.',
          qui: { user_id: actorId, email: actorEmail },
          quand: { iso: new Date().toISOString(), fuseau: Intl.DateTimeFormat().resolvedOptions().timeZone },
          quoi: {
            ressource: 'site_settings',
            opération: 'upsert',
            conflit: 'id',
          },
          comment_technique: {
            api: 'supabase.from("site_settings").upsert(payload, { onConflict: "id" })',
            payload_envoyé: payload,
            état_avant_lecture: rowBefore,
            état_après_envoi: payload,
            diff,
          },
          client: buildClientContext(),
        },
      });

      toast.success('Paramètres enregistrés');
      void loadAuditLogs();
    } catch (e: unknown) {
      console.error(e);
      toast.error('Erreur lors de l’enregistrement');
      void insertSiteSettingsAudit(supabase, {
        actorUserId: actorId,
        actorEmail,
        action: 'site_settings.save_error',
        summary: "Échec de l'enregistrement des paramètres du site",
        details: {
          comment: 'Erreur levée lors du upsert ou de la lecture préalable.',
          erreur: e instanceof Error ? { message: e.message, name: e.name } : String(e),
          état_lecture_avant_echec: rowBefore,
          tentative: {
            maintenance_enabled: maintenanceEnabled,
            maintenance_message: maintenanceMessage.trim() || null,
          },
          client: buildClientContext(),
        },
      });
      void loadAuditLogs();
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="max-w-4xl space-y-8">
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

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-lg font-heading font-semibold text-text-dark">Journal d&apos;activité</h2>
            <p className="text-sm text-gray-600">
              Traçabilité des actions sur cette page : qui, quand, quoi, comment (dont contexte client et
              détails techniques).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadAuditLogs()}
            disabled={auditLoading}
            className="shrink-0 inline-flex items-center gap-2"
          >
            <RefreshCw size={16} className={cn(auditLoading && 'animate-spin')} aria-hidden />
            Rafraîchir
          </Button>
        </div>

        {auditLoading && auditLogs.length === 0 ? (
          <p className="text-sm text-gray-500">Chargement du journal…</p>
        ) : auditLogs.length === 0 ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Aucune entrée. Si la table n&apos;existe pas encore, exécutez{' '}
            <code className="text-xs bg-amber-100 px-1 rounded">SITE_SETTINGS_AUDIT_LOG.sql</code> dans
            Supabase.
          </p>
        ) : (
          <div className="scrollbar-thin overflow-x-auto border border-gray-200 rounded-lg max-h-[min(70vh,32rem)] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Quand</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Qui</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium min-w-[12rem]">Résumé</th>
                  <th className="px-3 py-2 font-medium w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLogs.map((row) => {
                  const open = expandedId === row.id;
                  return (
                    <Fragment key={row.id}>
                      <tr className="bg-white hover:bg-gray-50/80 align-top">
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                          {new Date(row.created_at).toLocaleString('fr-FR', {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })}
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-gray-900 break-all">{row.actor_email}</span>
                          {row.actor_user_id && (
                            <span className="block text-xs text-gray-400 font-mono truncate max-w-[10rem]">
                              {row.actor_user_id}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{row.action}</code>
                        </td>
                        <td className="px-3 py-2 text-gray-800">{row.summary}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setExpandedId(open ? null : row.id)}
                            className="p-1 rounded text-secondary hover:bg-secondary/10"
                            aria-expanded={open}
                            title={open ? 'Masquer le détail' : 'Voir comment (JSON)'}
                          >
                            {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-gray-50">
                          <td colSpan={5} className="px-3 py-3 text-xs font-mono border-t border-gray-200">
                            <p className="text-gray-600 font-sans text-xs mb-2 font-medium">
                              Détails (comment / JSON)
                            </p>
                            <pre className="scrollbar-thin whitespace-pre-wrap break-all text-gray-800 max-h-64 overflow-y-auto">
                              {row.details ? JSON.stringify(row.details, null, 2) : '—'}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-3">
          Affichage des {AUDIT_PAGE_SIZE} entrées les plus récentes.
        </p>
      </div>
    </div>
  );
}
