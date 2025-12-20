import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import { Button } from '../ui/Button';

export function Footer() {
  return (
    <footer className="bg-neutral-light text-text-dark">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* À propos */}
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4 text-secondary">ByValsue</h3>
            <p className="text-sm text-text-dark/80 mb-4">
              Boutique en ligne malgache de mode féminine haut de gamme. Découvrez nos collections exclusives.
            </p>
            <div className="flex gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-dark hover:text-secondary transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-dark hover:text-secondary transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-dark hover:text-secondary transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </a>
            </div>
          </div>

          {/* Liens rapides */}
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4 text-secondary">Liens rapides</h3>
            <ul className="space-y-2 text-sm">
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
            <div className="flex gap-4">
              <Link to="/mentions-legales" className="hover:text-secondary transition-colors">
                Mentions légales
              </Link>
              <Link to="/cgv" className="hover:text-secondary transition-colors">
                CGV
              </Link>
              <Link to="/confidentialite" className="hover:text-secondary transition-colors">
                Confidentialité
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

