import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { NEWSLETTER_CONSENT_VERSION } from '../../lib/newsletterConsent';

type NewsletterSource = 'footer' | 'home';

interface NewsletterSubscribeFormProps {
  source: NewsletterSource;
  title?: string;
  description?: string;
  placeholder?: string;
  buttonText?: string;
  className?: string;
}

type RpcResult = {
  ok?: boolean;
  error?: string;
  status?: string;
};

export function NewsletterSubscribeForm({
  source,
  title,
  description,
  placeholder = 'Votre email',
  buttonText = "S'abonner",
  className = '',
}: NewsletterSubscribeFormProps) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; consent?: string }>({});

  const validate = () => {
    const next: { email?: string; consent?: string } = {};
    const trimmed = email.trim();
    if (!trimmed) {
      next.email = 'L’email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      next.email = 'L’email n’est pas valide';
    }
    if (!consent) {
      next.consent = 'Veuillez accepter pour vous inscrire';
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('subscribe_newsletter', {
        p_email: email.trim(),
        p_source: source,
        p_consent: true,
        p_consent_version: NEWSLETTER_CONSENT_VERSION,
      });

      if (error) {
        console.error('subscribe_newsletter', error);
        toast.error(error.message || 'Une erreur est survenue. Réessayez plus tard.');
        return;
      }

      const payload = data as RpcResult | null;
      if (!payload?.ok) {
        const key = payload?.error;
        if (key === 'invalid_email') {
          toast.error('Adresse email invalide');
        } else if (key === 'consent_required') {
          toast.error('Le consentement est obligatoire');
        } else {
          toast.error('Inscription impossible. Réessayez plus tard.');
        }
        return;
      }

      if (payload.status === 'already_subscribed') {
        toast.success('Vous êtes déjà inscrit à la newsletter.');
      } else {
        toast.success('Merci ! Vous êtes bien inscrit à la newsletter.');
      }
      setEmail('');
      setConsent(false);
      setFieldErrors({});
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      {title ? (
        <h3 className="font-heading font-semibold text-lg mb-4 text-secondary">{title}</h3>
      ) : null}
      {description ? (
        <p className="text-sm text-text-dark/80 mb-4">{description}</p>
      ) : null}
      <form className="space-y-3" onSubmit={handleSubmit} noValidate>
        <div>
          <input
            type="email"
            name="newsletter-email"
            autoComplete="email"
            placeholder={placeholder}
            value={email}
            onChange={(ev) => {
              setEmail(ev.target.value);
              if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
            }}
            className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary text-sm"
            disabled={isLoading}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'newsletter-email-error' : undefined}
          />
          {fieldErrors.email ? (
            <p id="newsletter-email-error" className="mt-1 text-xs text-red-600" role="alert">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>
        <div>
          <label className="flex items-start gap-2 text-text-dark/90 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(ev) => {
                setConsent(ev.target.checked);
                if (fieldErrors.consent) setFieldErrors((p) => ({ ...p, consent: undefined }));
              }}
              className="mt-1 rounded border-neutral-support text-primary focus:ring-primary"
              disabled={isLoading}
            />
            <span className="text-xs">
              J’accepte de recevoir la newsletter et d’être informé des offres, conformément à la{' '}
              <Link to="/confidentialite" className="text-secondary underline hover:text-primary">
                politique de confidentialité
              </Link>
              .
            </span>
          </label>
          {fieldErrors.consent ? (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {fieldErrors.consent}
            </p>
          ) : null}
        </div>
        <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="animate-spin shrink-0" size={18} />
              Envoi…
            </>
          ) : (
            buttonText
          )}
        </Button>
      </form>
    </div>
  );
}
