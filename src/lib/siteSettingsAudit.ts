import type { SupabaseClient } from '@supabase/supabase-js';

export type SiteSettingsAuditAction =
  | 'site_settings.consultation'
  | 'site_settings.save'
  | 'site_settings.save_error';

export interface SiteSettingsAuditLogRow {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_email: string;
  action: string;
  resource: string;
  summary: string;
  details: Record<string, unknown> | null;
}

export async function insertSiteSettingsAudit(
  supabase: SupabaseClient,
  params: {
    actorUserId: string | null;
    actorEmail: string;
    action: SiteSettingsAuditAction | string;
    summary: string;
    details?: Record<string, unknown> | null;
  },
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('site_settings_audit_log').insert({
    actor_user_id: params.actorUserId,
    actor_email: params.actorEmail,
    action: params.action,
    resource: 'site_settings',
    summary: params.summary,
    details: params.details ?? null,
  });
  return { error: error ? new Error(error.message) : null };
}

export function buildClientContext(): Record<string, string | null | undefined> {
  if (typeof navigator === 'undefined') {
    return {};
  }
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
  };
}
