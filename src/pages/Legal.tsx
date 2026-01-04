import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { SEO } from '../components/seo/SEO';

const legalContent: Record<string, { title: string; content: string }> = {
  'mentions-legales': {
    title: 'Mentions Légales',
    content: `
      <h2>Éditeur</h2>
      <p>ByValsue - Boutique en ligne de mode féminine</p>
      <p>Madagascar</p>
      
      <h2>Hébergement</h2>
      <p>Le site est hébergé par...</p>
      
      <h2>Contact</h2>
      <p>Email: contact@eshopbyvalsue.mg</p>
      <p>Téléphone: +261 XX XX XXX XX</p>
    `,
  },
  cgv: {
    title: 'Conditions Générales de Vente',
    content: `
      <h2>1. Objet</h2>
      <p>Les présentes conditions générales de vente régissent les relations entre ByValsue et ses clients.</p>
      
      <h2>2. Prix</h2>
      <p>Les prix sont indiqués en Ariary (MGA) et sont valables tant qu'ils sont visibles sur le site.</p>
      
      <h2>3. Commande</h2>
      <p>Toute commande vaut acceptation des présentes conditions générales de vente.</p>
      
      <h2>4. Paiement</h2>
      <p>Le paiement peut être effectué par Mobile Money ou à la livraison.</p>
      
      <h2>5. Livraison</h2>
      <p>La livraison est effectuée dans un délai de 3 à 5 jours ouvrés.</p>
      
      <h2>6. Retours</h2>
      <p>Les retours sont acceptés sous 14 jours, articles non portés avec étiquettes.</p>
    `,
  },
  confidentialite: {
    title: 'Politique de Confidentialité',
    content: `
      <h2>1. Données collectées</h2>
      <p>Nous collectons les données nécessaires à la gestion de votre compte et de vos commandes.</p>
      
      <h2>2. Utilisation des données</h2>
      <p>Vos données sont utilisées uniquement pour le traitement de vos commandes et l'amélioration de nos services.</p>
      
      <h2>3. Protection des données</h2>
      <p>Nous mettons en œuvre toutes les mesures nécessaires pour protéger vos données personnelles.</p>
      
      <h2>4. Vos droits</h2>
      <p>Vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles.</p>
    `,
  },
  retours: {
    title: 'Politique de Retours',
    content: `
      <h2>Délai de retour</h2>
      <p>Vous disposez de 14 jours à compter de la réception de votre commande pour retourner un article.</p>
      
      <h2>Conditions</h2>
      <p>Les articles doivent être retournés dans leur état d'origine, non portés, avec leurs étiquettes.</p>
      
      <h2>Procédure</h2>
      <p>Contactez-nous à contact@eshopbyvalsue.mg pour obtenir un numéro de retour.</p>
      
      <h2>Remboursement</h2>
      <p>Le remboursement sera effectué dans un délai de 14 jours après réception de l'article retourné.</p>
    `,
  },
};

const seoConfig: Record<string, {
  title: string;
  description: string;
  keywords: string;
  url: string;
  structuredData: object;
}> = {
  'mentions-legales': {
    title: 'Mentions Légales',
    description: 'Mentions légales de ByValsue - Boutique en ligne de mode féminine à Madagascar. Informations sur l\'éditeur, l\'hébergement et les coordonnées de contact.',
    keywords: 'mentions légales, ByValsue, boutique en ligne, Madagascar, éditeur, hébergement, contact',
    url: '/mentions-legales',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Mentions Légales - ByValsue',
      description: 'Mentions légales de la boutique en ligne ByValsue',
      url: 'https://eshopbyvalsue.mg/mentions-legales',
      publisher: {
        '@type': 'Organization',
        name: 'ByValsue',
        url: 'https://eshopbyvalsue.mg',
      },
    },
  },
  cgv: {
    title: 'Conditions Générales de Vente',
    description: 'Conditions générales de vente de ByValsue. Découvrez nos conditions de commande, paiement, livraison et retours pour votre achat en ligne de mode féminine.',
    keywords: 'CGV, conditions générales de vente, ByValsue, commande, paiement, livraison, retours, e-commerce Madagascar',
    url: '/cgv',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Conditions Générales de Vente - ByValsue',
      description: 'Conditions générales de vente de la boutique en ligne ByValsue',
      url: 'https://eshopbyvalsue.mg/cgv',
      publisher: {
        '@type': 'Organization',
        name: 'ByValsue',
        url: 'https://eshopbyvalsue.mg',
      },
    },
  },
  confidentialite: {
    title: 'Politique de Confidentialité',
    description: 'Politique de confidentialité et protection des données personnelles de ByValsue. Découvrez comment nous collectons, utilisons et protégeons vos données.',
    keywords: 'politique de confidentialité, protection des données, RGPD, vie privée, données personnelles, ByValsue, Madagascar',
    url: '/confidentialite',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Politique de Confidentialité - ByValsue',
      description: 'Politique de confidentialité et protection des données personnelles de ByValsue',
      url: 'https://eshopbyvalsue.mg/confidentialite',
      publisher: {
        '@type': 'Organization',
        name: 'ByValsue',
        url: 'https://eshopbyvalsue.mg',
      },
    },
  },
  retours: {
    title: 'Politique de Retours',
    description: 'Politique de retours et remboursements de ByValsue. Découvrez nos conditions de retour, délais et procédures pour vos achats de mode féminine.',
    keywords: 'politique de retours, remboursement, retour article, échange, ByValsue, e-commerce Madagascar, mode féminine',
    url: '/retours',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Politique de Retours - ByValsue',
      description: 'Politique de retours et remboursements de la boutique en ligne ByValsue',
      url: 'https://eshopbyvalsue.mg/retours',
      publisher: {
        '@type': 'Organization',
        name: 'ByValsue',
        url: 'https://eshopbyvalsue.mg',
      },
    },
  },
};

export default function Legal() {
  const location = useLocation();
  const page = location.pathname.replace('/', '');
  const content = legalContent[page] || legalContent['mentions-legales'];
  const seo = seoConfig[page] || seoConfig['mentions-legales'];

  return (
    <>
      <SEO
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        url={seo.url}
        structuredData={seo.structuredData}
      />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-heading font-bold text-text-dark mb-8">
            {content.title}
          </h1>
          <div
            className="prose prose-lg max-w-none text-text-dark/80"
            dangerouslySetInnerHTML={{ __html: content.content }}
          />
          
          {/* Navigation vers autres pages légales */}
          <div className="mt-12 pt-8 border-t border-neutral-support">
            <h2 className="text-2xl font-heading font-semibold text-text-dark mb-4">
              Autres pages légales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {page !== 'mentions-legales' && (
                <Link
                  to="/mentions-legales"
                  className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border-2 border-transparent hover:border-secondary"
                >
                  <h3 className="font-heading font-semibold text-lg text-text-dark mb-1">
                    Mentions légales
                  </h3>
                  <p className="text-text-dark/70 text-sm">
                    Informations sur l'éditeur et l'hébergement
                  </p>
                </Link>
              )}
              {page !== 'cgv' && (
                <Link
                  to="/cgv"
                  className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border-2 border-transparent hover:border-secondary"
                >
                  <h3 className="font-heading font-semibold text-lg text-text-dark mb-1">
                    Conditions générales de vente
                  </h3>
                  <p className="text-text-dark/70 text-sm">
                    Conditions de commande, paiement et livraison
                  </p>
                </Link>
              )}
              {page !== 'confidentialite' && (
                <Link
                  to="/confidentialite"
                  className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border-2 border-transparent hover:border-secondary"
                >
                  <h3 className="font-heading font-semibold text-lg text-text-dark mb-1">
                    Politique de confidentialité
                  </h3>
                  <p className="text-text-dark/70 text-sm">
                    Protection et utilisation de vos données personnelles
                  </p>
                </Link>
              )}
              {page !== 'retours' && (
                <Link
                  to="/retours"
                  className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border-2 border-transparent hover:border-secondary"
                >
                  <h3 className="font-heading font-semibold text-lg text-text-dark mb-1">
                    Politique de retours
                  </h3>
                  <p className="text-text-dark/70 text-sm">
                    Conditions et procédures de retour
                  </p>
                </Link>
              )}
            </div>
          </div>

          {/* Lien vers la boutique */}
          <div className="mt-8 text-center">
            <Link
              to="/boutique"
              className="inline-block text-secondary hover:text-primary font-medium underline text-lg"
            >
              Retour à la boutique
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

