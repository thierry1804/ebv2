import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { formatPrice } from '../utils/formatters';
import { Address } from '../types';
import toast from 'react-hot-toast';

type Step = 'shipping' | 'payment' | 'confirmation';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, getSubtotal, getTotal, clearCart } = useCart();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('shipping');
  const [shippingAddress, setShippingAddress] = useState<Partial<Address>>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    street: '',
    city: '',
    postalCode: '',
    country: 'Madagascar',
    phone: user?.phone || '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'cash_on_delivery'>(
    'cash_on_delivery'
  );
  const [orderNumber] = useState(`CMD-${Date.now()}`);

  const shippingCost = getSubtotal() >= 200000 ? 0 : 10000;
  const total = getTotal(shippingCost);

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      shippingAddress.firstName &&
      shippingAddress.lastName &&
      shippingAddress.street &&
      shippingAddress.city &&
      shippingAddress.phone
    ) {
      setStep('payment');
    } else {
      toast.error('Veuillez remplir tous les champs obligatoires');
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('confirmation');
    clearCart();
    toast.success('Commande confirmée !');
  };

  if (items.length === 0 && step !== 'confirmation') {
    navigate('/panier');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-heading font-bold text-text-dark mb-8">Commande</h1>

      {/* Étapes */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[
            { id: 'shipping', label: 'Livraison' },
            { id: 'payment', label: 'Paiement' },
            { id: 'confirmation', label: 'Confirmation' },
          ].map((s, index) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step === s.id
                      ? 'bg-accent text-white'
                      : ['shipping', 'payment', 'confirmation'].indexOf(step) >
                        ['shipping', 'payment', 'confirmation'].indexOf(s.id as Step)
                      ? 'bg-green-500 text-white'
                      : 'bg-neutral-support text-text-dark'
                  }`}
                >
                  {index + 1}
                </div>
                <span className="mt-2 text-sm text-text-dark/80">{s.label}</span>
              </div>
              {index < 2 && (
                <div
                  className={`h-1 flex-1 mx-2 ${
                    ['shipping', 'payment', 'confirmation'].indexOf(step) > index
                      ? 'bg-green-500'
                      : 'bg-neutral-support'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulaire */}
        <div className="lg:col-span-2">
          {step === 'shipping' && (
            <form onSubmit={handleShippingSubmit} className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-2xl font-heading font-semibold text-text-dark mb-6">
                Informations de livraison
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.firstName}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, firstName: e.target.value })
                    }
                    className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">Nom *</label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.lastName}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, lastName: e.target.value })
                    }
                    className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-dark mb-2">
                  Adresse *
                </label>
                <input
                  type="text"
                  required
                  value={shippingAddress.street}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, street: e.target.value })
                  }
                  className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">Ville *</label>
                  <input
                    type="text"
                    required
                    value={shippingAddress.city}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, city: e.target.value })
                    }
                    className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.postalCode}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, postalCode: e.target.value })
                    }
                    className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-dark mb-2">
                  Téléphone *
                </label>
                <input
                  type="tel"
                  required
                  value={shippingAddress.phone}
                  onChange={(e) =>
                    setShippingAddress({ ...shippingAddress, phone: e.target.value })
                  }
                  className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-dark mb-2">Pays</label>
                <input
                  type="text"
                  value={shippingAddress.country}
                  disabled
                  className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg bg-neutral-light"
                />
              </div>
              <Button type="submit" variant="primary" size="lg" className="w-full">
                Continuer vers le paiement
              </Button>
            </form>
          )}

          {step === 'payment' && (
            <form onSubmit={handlePaymentSubmit} className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-2xl font-heading font-semibold text-text-dark mb-6">
                Méthode de paiement
              </h2>
              <div className="space-y-4 mb-6">
                <label className="flex items-center gap-3 p-4 border-2 border-neutral-support rounded-lg cursor-pointer hover:border-primary transition-colors">
                  <input
                    type="radio"
                    name="payment"
                    value="cash_on_delivery"
                    checked={paymentMethod === 'cash_on_delivery'}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as 'cash_on_delivery' | 'mobile_money')
                    }
                    className="text-primary"
                  />
                  <div>
                    <p className="font-medium text-text-dark">Paiement à la livraison</p>
                    <p className="text-sm text-text-dark/80">
                      Payez en espèces lors de la réception de votre commande
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 border-2 border-neutral-support rounded-lg cursor-pointer hover:border-primary transition-colors">
                  <input
                    type="radio"
                    name="payment"
                    value="mobile_money"
                    checked={paymentMethod === 'mobile_money'}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as 'cash_on_delivery' | 'mobile_money')
                    }
                    className="text-primary"
                  />
                  <div>
                    <p className="font-medium text-text-dark">Mobile Money</p>
                    <p className="text-sm text-text-dark/80">
                      Orange Money, Airtel Money, MVola
                    </p>
                  </div>
                </label>
              </div>
              {paymentMethod === 'mobile_money' && (
                <div className="mb-6 p-4 bg-neutral-light rounded-lg">
                  <p className="text-sm text-text-dark/80 mb-2">
                    Vous recevrez les instructions de paiement par email après confirmation de la
                    commande.
                  </p>
                </div>
              )}
              <Button type="submit" variant="primary" size="lg" className="w-full">
                Confirmer la commande
              </Button>
            </form>
          )}

          {step === 'confirmation' && (
            <div className="bg-white rounded-lg p-6 shadow-sm text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✓</span>
              </div>
              <h2 className="text-2xl font-heading font-semibold text-text-dark mb-4">
                Commande confirmée !
              </h2>
              <p className="text-text-dark/80 mb-2">
                Merci pour votre commande. Votre numéro de commande est :
              </p>
              <p className="text-xl font-bold text-accent mb-6">{orderNumber}</p>
              <p className="text-text-dark/80 mb-6">
                Vous recevrez un email de confirmation avec les détails de votre commande.
              </p>
              <div className="flex gap-4 justify-center">
                <Button variant="primary" onClick={() => navigate('/boutique')}>
                  Continuer mes achats
                </Button>
                <Button variant="outline" onClick={() => navigate('/compte')}>
                  Voir mes commandes
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Résumé */}
        {step !== 'confirmation' && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 shadow-sm sticky top-24">
              <h2 className="text-xl font-heading font-semibold text-text-dark mb-6">
                Résumé
              </h2>
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-dark">{item.product.name}</p>
                      <p className="text-xs text-text-dark/80">
                        {item.size && `${item.size}`}
                        {item.size && item.color && ' • '}
                        {item.color && `${item.color}`}
                        {(item.size || item.color) && ' • '}
                        x{item.quantity}
                      </p>
                      <p className="text-sm font-semibold text-text-dark">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-neutral-support pt-4 space-y-2">
                <div className="flex justify-between text-text-dark/80">
                  <span>Sous-total</span>
                  <span>{formatPrice(getSubtotal())}</span>
                </div>
                <div className="flex justify-between text-text-dark/80">
                  <span>Livraison</span>
                  <span>
                    {shippingCost === 0 ? (
                      <span className="text-green-600">Gratuite</span>
                    ) : (
                      formatPrice(shippingCost)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold text-text-dark pt-2 border-t border-neutral-support">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

