import { Button } from '../components/ui/Button';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function Contact() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-heading font-bold text-text-dark mb-8 text-center">
          Contactez-nous
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Formulaire */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-2xl font-heading font-semibold text-text-dark mb-6">
              Envoyez-nous un message
            </h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-dark mb-2">Nom</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dark mb-2">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dark mb-2">Message</label>
                <textarea
                  rows={5}
                  className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <Button variant="primary" size="lg" className="w-full">
                Envoyer
              </Button>
            </form>
          </div>

          {/* Informations */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-heading font-semibold text-text-dark mb-4">
                Informations de contact
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="text-secondary mt-1" size={20} />
                  <div>
                    <p className="font-medium text-text-dark">Email</p>
                    <p className="text-text-dark/80">contact@eshopbyvalsue.mg</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="text-secondary mt-1" size={20} />
                  <div>
                    <p className="font-medium text-text-dark">Téléphone</p>
                    <p className="text-text-dark/80">+261 XX XX XXX XX</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="text-secondary mt-1" size={20} />
                  <div>
                    <p className="font-medium text-text-dark">Adresse</p>
                    <p className="text-text-dark/80">Madagascar</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-heading font-semibold text-text-dark mb-4">
                Horaires d'ouverture
              </h3>
              <div className="space-y-2 text-text-dark/80">
                <p>Lundi - Vendredi : 9h - 18h</p>
                <p>Samedi : 9h - 13h</p>
                <p>Dimanche : Fermé</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

