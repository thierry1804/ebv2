import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SEO } from '../components/seo/SEO';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RpcResult = {
  ok?: boolean;
  error?: string;
  status?: string;
};

export default function NewsletterUnsubscribe() {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token')?.trim() ?? '';
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!tokenParam || !UUID_RE.test(tokenParam)) {
        setStatus('error');
        setMessage('Lien de désinscription invalide ou incomplet.');
        return;
      }

      const { data, error } = await supabase.rpc('unsubscribe_newsletter', {
        p_token: tokenParam,
      });

      if (cancelled) return;

      if (error) {
        setStatus('error');
        setMessage(error.message || 'Une erreur est survenue. Réessayez plus tard.');
        return;
      }

      const payload = data as RpcResult | null;
      if (!payload?.ok) {
        setStatus('error');
        setMessage(
          payload?.error === 'invalid_token'
            ? 'Ce lien de désinscription n’est plus valide.'
            : 'La désinscription a échoué. Réessayez plus tard.'
        );
        return;
      }

      setStatus('ok');
      if (payload.status === 'already_unsubscribed') {
        setMessage('Vous étiez déjà désinscrit de la newsletter.');
      } else {
        setMessage('Vous êtes bien désinscrit de la newsletter. À bientôt sur ByValsue.');
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [tokenParam]);

  return (
    <div className="container mx-auto px-4 py-16 max-w-lg">
      <SEO
        title="Désinscription newsletter"
        description="Confirmez votre désinscription à la newsletter ByValsue."
        url="/newsletter/desabonner"
      />
      <h1 className="text-2xl font-heading font-bold text-text-dark mb-4">Newsletter</h1>
      {status === 'loading' ? (
        <p className="text-text-dark/80">Traitement en cours…</p>
      ) : (
        <p
          className={
            status === 'ok' ? 'text-text-dark/90' : 'text-red-700'
          }
          role="status"
        >
          {message}
        </p>
      )}
      <p className="mt-8">
        <Link to="/" className="text-secondary font-medium hover:text-primary underline">
          Retour à l’accueil
        </Link>
      </p>
    </div>
  );
}
