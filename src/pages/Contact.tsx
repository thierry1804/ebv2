import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Mail, Phone, MapPin, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import emailjs from '@emailjs/browser';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Configuration EmailJS - À configurer dans les variables d'environnement
  const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
  const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
  const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Le message est requis';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Le message doit contenir au moins 10 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    // Vérifier si EmailJS est configuré
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      toast.error(
        'Configuration EmailJS manquante. Veuillez configurer les variables d\'environnement.',
        { duration: 5000 }
      );
      console.error('EmailJS configuration manquante. Variables requises:');
      console.error('- VITE_EMAILJS_SERVICE_ID');
      console.error('- VITE_EMAILJS_TEMPLATE_ID');
      console.error('- VITE_EMAILJS_PUBLIC_KEY');
      return;
    }

    setIsLoading(true);

    try {
      // Initialiser EmailJS avec la clé publique
      emailjs.init(EMAILJS_PUBLIC_KEY);

      // Envoyer l'email
      const result = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name: formData.name,
          from_email: formData.email,
          message: formData.message,
          to_email: 'contact@eshopbyvalsue.mg',
        }
      );

      if (result.status === 200) {
        toast.success('Message envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.');
        // Réinitialiser le formulaire
        setFormData({
          name: '',
          email: '',
          message: '',
        });
        setErrors({});
      } else {
        throw new Error('Erreur lors de l\'envoi');
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      toast.error(
        error.text || 'Une erreur est survenue lors de l\'envoi du message. Veuillez réessayer.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const mapEmbedUrl = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d11663.085015077057!2d47.474133251727245!3d-18.83184333245488!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x21f08176a89c0c7b%3A0x2b03d7f2381b5137!2sAmbohijanahary%2C%20Tananarive!5e1!3m2!1sfr!2smg!4v1766295190681!5m2!1sfr!2smg';

  return (
    <div className="relative min-h-screen">
      {/* Carte Google Maps en arrière-plan */}
      <div className="absolute inset-0 z-0 opacity-60">
        <iframe
          src={mapEmbedUrl}
          width="100%"
          height="100%"
          style={{ border: 0, filter: 'grayscale(100%)' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>

      {/* Contenu par-dessus la carte */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-heading font-bold text-text-dark mb-8 text-center">
            Contactez-nous
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Formulaire */}
            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-6 shadow-lg">
              <h2 className="text-2xl font-heading font-semibold text-text-dark mb-6">
                Envoyez-nous un message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.name
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-neutral-support focus:border-primary'
                    }`}
                    placeholder="Votre nom"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors ${
                      errors.email
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-neutral-support focus:border-primary'
                    }`}
                    placeholder="votre@email.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors resize-none ${
                      errors.message
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-neutral-support focus:border-primary'
                    }`}
                    placeholder="Votre message..."
                  />
                  {errors.message && (
                    <p className="mt-1 text-sm text-red-500">{errors.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" size={20} />
                      Envoi en cours...
                    </>
                  ) : (
                    'Envoyer'
                  )}
                </Button>
              </form>
            </div>

            {/* Informations */}
            <div className="space-y-6">
              <div className="bg-white/95 backdrop-blur-sm rounded-lg p-6 shadow-lg">
                <h3 className="text-xl font-heading font-semibold text-text-dark mb-4">
                  Informations de contact
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="text-secondary mt-1 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-medium text-text-dark">Email</p>
                      <a
                        href="mailto:contact@eshopbyvalsue.mg"
                        className="text-text-dark/80 hover:text-secondary transition-colors"
                      >
                        contact@eshopbyvalsue.mg
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="text-secondary mt-1 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-medium text-text-dark">Téléphone</p>
                      <a
                        href="tel:+261384271168"
                        className="text-text-dark/80 hover:text-secondary transition-colors"
                      >
                        +261 38 42 711 68
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="text-secondary mt-1 flex-shrink-0" size={20} />
                    <div>
                      <p className="font-medium text-text-dark">Adresse</p>
                      <p className="text-text-dark/80">
                        Ambohijanahary, Tananarive, Madagascar
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/95 backdrop-blur-sm rounded-lg p-6 shadow-lg">
                <h3 className="text-xl font-heading font-semibold text-text-dark mb-4">
                  Horaires d'ouverture
                </h3>
                <div className="space-y-2 text-text-dark/80">
                  <p>Lundi - Vendredi : 9h - 18h</p>
                  <p>Samedi : 9h - 13h</p>
                  <p>Dimanche : Fermé</p>
                </div>
              </div>

              {/* Carte interactive visible sur mobile/tablette */}
              <div className="bg-white/95 backdrop-blur-sm rounded-lg p-6 shadow-lg md:hidden">
                <h3 className="text-xl font-heading font-semibold text-text-dark mb-4">
                  Notre localisation
                </h3>
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={mapEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
