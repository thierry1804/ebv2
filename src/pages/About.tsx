import { SEO } from '../components/seo/SEO';

export default function About() {
  return (
    <>
      <SEO
        title="À propos"
        description="Découvrez l'histoire de ByValsue, notre mission, nos valeurs et notre équipe. Une boutique en ligne de mode féminine haut de gamme à Madagascar."
        keywords="à propos, ByValsue, histoire, valeurs, équipe, mode féminine, Madagascar"
        url="/a-propos"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'À propos de ByValsue',
          description: 'Découvrez l\'histoire et les valeurs de ByValsue',
          url: 'https://eshopbyvalsue.mg/a-propos',
        }}
      />
      <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-heading font-bold text-text-dark mb-8 text-center">
          À propos de ByValsue
        </h1>

        <div className="space-y-8 text-text-dark/80">
          <section>
            <h2 className="text-2xl font-heading font-semibold text-text-dark mb-4">
              Notre histoire
            </h2>
            <p className="mb-4">
              ByValsue est née d'une passion pour la mode féminine haut de gamme et d'un désir de
              rendre accessible l'élégance et la sophistication à toutes les femmes malgaches.
            </p>
            <p>
              Fondée en 2020, notre boutique en ligne propose des collections soigneusement
              sélectionnées qui allient qualité, style et accessibilité. Nous croyons que chaque
              femme mérite de se sentir belle et confiante dans ses vêtements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-semibold text-text-dark mb-4">
              Nos valeurs
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>
                <strong>Qualité :</strong> Nous sélectionnons uniquement des produits de haute
                qualité qui résistent à l'épreuve du temps.
              </li>
              <li>
                <strong>Élégance :</strong> Chaque pièce de notre collection est choisie pour son
                style intemporel et raffiné.
              </li>
              <li>
                <strong>Accessibilité :</strong> Nous rendons la mode haut de gamme accessible à
                toutes les femmes.
              </li>
              <li>
                <strong>Service client :</strong> Votre satisfaction est notre priorité absolue.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-semibold text-text-dark mb-4">
              Notre équipe
            </h2>
            <p>
              Notre équipe passionnée travaille sans relâche pour vous offrir la meilleure
              expérience d'achat possible. De la sélection des produits à la livraison, nous
              veillons à chaque détail pour vous garantir satisfaction et qualité.
            </p>
          </section>
        </div>
      </div>
    </div>
    </>
  );
}

