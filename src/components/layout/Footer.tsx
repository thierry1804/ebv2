import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { SocialMediaConfig } from '../../types';

export function Footer() {
  const [socialConfig, setSocialConfig] = useState<SocialMediaConfig>({
    brandName: 'ByValsue',
    description: 'Boutique en ligne malgache de mode féminine haut de gamme. Découvrez nos collections exclusives.',
    facebookUrl: '',
    instagramUrl: '',
    twitterUrl: '',
    tiktokUrl: '',
    isVisible: true,
  });

  useEffect(() => {
    loadSocialConfig();
  }, []);

  const loadSocialConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('landing_page_config')
        .select('*')
        .eq('section_key', 'social_media')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Erreur lors du chargement de la configuration des réseaux sociaux:', error);
        return;
      }

      if (data && data.config_data) {
        setSocialConfig(data.config_data as SocialMediaConfig);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la configuration:', error);
    }
  };

  return (
    <footer className="bg-neutral-light text-text-dark">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* À propos */}
          {socialConfig.isVisible && (
            <div>
              <h3 className="font-heading font-semibold text-lg mb-4 text-secondary">{socialConfig.brandName}</h3>
              <p className="text-sm text-text-dark/80 mb-4">
                {socialConfig.description}
              </p>
              <div className="flex gap-3">
                {socialConfig.facebookUrl && (
                  <a
                    href={socialConfig.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-dark hover:text-secondary transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook size={20} />
                  </a>
                )}
                {socialConfig.instagramUrl && (
                  <a
                    href={socialConfig.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-dark hover:text-secondary transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram size={20} />
                  </a>
                )}
                {socialConfig.twitterUrl && (
                  <a
                    href={socialConfig.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-dark hover:text-secondary transition-colors"
                    aria-label="Twitter"
                  >
                    <Twitter size={20} />
                  </a>
                )}
                {socialConfig.tiktokUrl && (
                  <a
                    href={socialConfig.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-dark hover:text-secondary transition-colors"
                    aria-label="TikTok"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19.59 9.17a4.83 4.83 0 0 1-3.77-4.25V4h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.6z" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Liens rapides */}
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4 text-secondary">Liens rapides</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-text-dark/90 hover:text-secondary font-medium transition-colors">
                  Accueil
                </Link>
              </li>
              <li>
                <Link to="/boutique" className="text-text-dark/90 hover:text-secondary font-medium transition-colors">
                  Boutique
                </Link>
              </li>
              <li>
                <Link to="/boutique?filter=new" className="text-text-dark/80 hover:text-secondary transition-colors">
                  Nouveautés
                </Link>
              </li>
              <li>
                <Link to="/boutique?filter=sale" className="text-text-dark/80 hover:text-secondary transition-colors">
                  Soldes
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-text-dark/80 hover:text-secondary transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/a-propos" className="text-text-dark/80 hover:text-secondary transition-colors">
                  À propos
                </Link>
              </li>
            </ul>
          </div>

          {/* Service client */}
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4 text-secondary">Service client</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/contact" className="text-text-dark/80 hover:text-secondary transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/livraison" className="text-text-dark/80 hover:text-secondary transition-colors">
                  Livraison
                </Link>
              </li>
              <li>
                <Link to="/retours" className="text-text-dark/80 hover:text-secondary transition-colors">
                  Retours
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-text-dark/80 hover:text-secondary transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4 text-secondary">Newsletter</h3>
            <p className="text-sm text-text-dark/80 mb-4">
              Inscrivez-vous pour recevoir nos offres exclusives et nouveautés.
            </p>
            <form className="space-y-2">
              <input
                type="email"
                placeholder="Votre email"
                className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary text-sm"
              />
              <Button variant="primary" className="w-full">
                S'abonner
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-neutral-support mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-text-dark/80">
            <p>&copy; {new Date().getFullYear()} ByValsue. Tous droits réservés.</p>
            <div className="flex gap-4 flex-wrap">
              <Link to="/mentions-legales" className="hover:text-secondary transition-colors">
                Mentions légales
              </Link>
              <Link to="/cgv" className="hover:text-secondary transition-colors">
                CGV
              </Link>
              <Link to="/confidentialite" className="hover:text-secondary transition-colors">
                Confidentialité
              </Link>
              <Link to="/retours" className="hover:text-secondary transition-colors">
                Retours
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

