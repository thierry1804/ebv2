import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { PageLoading } from '../../components/ui/PageLoading';

interface NewsletterSubscriberRow {
  id: string;
  email: string;
  subscribed_at: string;
  source: string;
  consent_version: string;
  unsubscribed_at: string | null;
  unsubscribe_token: string;
}

export default function AdminNewsletter() {
  const [rows, setRows] = useState<NewsletterSubscriberRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    void loadRows();
  }, []);

  const loadRows = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('id, email, subscribed_at, source, consent_version, unsubscribed_at, unsubscribe_token')
        .is('unsubscribed_at', null)
        .order('subscribed_at', { ascending: false });

      if (error) {
        console.error(error);
        toast.error(error.message || 'Impossible de charger les inscrits');
        setRows([]);
        return;
      }
      setRows((data as NewsletterSubscriberRow[]) || []);
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors du chargement');
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.email.toLowerCase().includes(q));
  }, [rows, search]);

  const exportCsv = () => {
    const header = ['email', 'subscribed_at', 'source', 'consent_version'];
    const lines = [
      header.join(','),
      ...filtered.map((r) =>
        [
          csvEscape(r.email),
          csvEscape(r.subscribed_at),
          csvEscape(r.source),
          csvEscape(r.consent_version),
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter-inscrits-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Newsletter</h1>
          <p className="text-sm text-gray-600 mt-1">
            Inscrits actifs (non désinscrits) : {rows.length}
          </p>
        </div>
        <Button type="button" variant="primary" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download size={18} />
          Exporter CSV ({filtered.length})
        </Button>
      </div>

      <div className="mb-4 relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
          aria-hidden
        />
        <input
          type="search"
          placeholder="Rechercher par email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-secondary focus:border-secondary"
        />
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Inscrit le</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Source</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Consentement</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    Aucun inscrit à afficher.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-mono text-gray-900">{r.email}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(r.subscribed_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.source}</td>
                    <td className="px-4 py-3 text-gray-600">{r.consent_version}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function csvEscape(value: string): string {
  const needsQuote = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}
