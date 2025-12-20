import { useLocation } from 'react-router-dom';

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

export function Legal() {
  const location = useLocation();
  const page = location.pathname.replace('/', '');
  const content = legalContent[page] || legalContent['mentions-legales'];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-heading font-bold text-text-dark mb-8">
          {content.title}
        </h1>
        <div
          className="prose prose-lg max-w-none text-text-dark/80"
          dangerouslySetInnerHTML={{ __html: content.content }}
        />
      </div>
    </div>
  );
}

