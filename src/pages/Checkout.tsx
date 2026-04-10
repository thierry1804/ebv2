import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { usePromoCodes } from '../hooks/usePromoCodes';
import { usePromoCodeRefunds } from '../hooks/usePromoCodeRefunds';
import { useOrders } from '../hooks/useOrders';
import { Button } from '../components/ui/Button';
import { formatPrice } from '../utils/formatters';
import { Address, type MobileMoneyOperator } from '../types';
import {
  MOBILE_MONEY_OPERATORS,
  MOBILE_MONEY_OPERATOR_IDS,
} from '../config/mobileMoney';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { normalizeImageApiUrl } from '../lib/imageApi';
import {
  formatMgPhoneDisplay,
  isValidMgMobilePhone,
  isValidMgPostalCodeOptional,
  normalizeMgPhoneDigits,
  normalizeMgPostalCode,
} from '../utils/madagascarContact';
import { formatAppError, withTimeout } from '../utils/errors';

type Step = 'shipping' | 'payment' | 'confirmation';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, getSubtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { validatePromoCode, getPromoCode, recordPromoCodeUsage, isLoading: isPromoLoading } = usePromoCodes();
  const { createRefund } = usePromoCodeRefunds();
  const { createOrder, isLoading: isCreatingOrder } = useOrders();
  const [step, setStep] = useState<Step>('shipping');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shippingAddress, setShippingAddress] = useState<Partial<Address>>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    street: '',
    city: '',
    postalCode: '',
    country: 'Madagascar',
    phone: user?.phone ? normalizeMgPhoneDigits(user.phone) : '',
  });
  /** Seule méthode proposée : Mobile Money (Orange Money, Airtel Money, MVola). */
  const paymentMethod = 'mobile_money' as const;
  const [orderNumber] = useState(`CMD-${Date.now()}`);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoCodeId, setPromoCodeId] = useState<string | null>(null);
  const [isPostApplicationPromo, setIsPostApplicationPromo] = useState(false);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [mobileMoneyOperator, setMobileMoneyOperator] = useState<MobileMoneyOperator>('mvola');
  const [mobileMoneyPaymentReference, setMobileMoneyPaymentReference] = useState('');

  const shippingCost = getSubtotal() >= 200000 ? 0 : 10000;
  const subtotal = getSubtotal();
  const discount = promoDiscount;
  const total = subtotal - discount; // Livraison en sus, non incluse dans le total

  // Charger l'adresse sauvegardée depuis localStorage
  useEffect(() => {
    const savedAddress = localStorage.getItem('saved_shipping_address');
    if (savedAddress && user) {
      try {
        const address = JSON.parse(savedAddress);
        setShippingAddress((prev) => ({
          ...prev,
          ...address,
          phone: address.phone != null ? normalizeMgPhoneDigits(String(address.phone)) : prev.phone,
          postalCode:
            address.postalCode != null ? normalizeMgPostalCode(String(address.postalCode)) : prev.postalCode,
        }));
        // Charger aussi les instructions de livraison si présentes
        if (address.deliveryInstructions) {
          setDeliveryInstructions(address.deliveryInstructions);
        }
      } catch (e) {
        console.error('Erreur lors du chargement de l\'adresse sauvegardée', e);
      }
    }
  }, [user]);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast.error('Veuillez saisir un code promo');
      return;
    }

    const result = await validatePromoCode(promoCode, user?.id || null, subtotal, items);

    if (result.isValid && result.discountAmount > 0) {
      // Vérifier si le code est applicable à postériori
      const promoDetails = await getPromoCode(promoCode);
      const isPostApp = promoDetails?.isPostApplication || false;
      setIsPostApplicationPromo(isPostApp);

      if (isPostApp) {
        // Code à postériori : on enregistre le code mais on n'applique pas la réduction
        setPromoCodeId(result.promoCodeId || null);
        setPromoApplied(true);
        // Ne pas modifier promoDiscount pour que le total reste inchangé
        toast.success(
          `Code promo enregistré ! Le remboursement de ${formatPrice(result.discountAmount)} sera traité ultérieurement.`
        );
      } else {
        // Code normal : appliquer la réduction immédiatement
        setPromoDiscount(result.discountAmount);
        setPromoApplied(true);
        setPromoCodeId(result.promoCodeId || null);
        
        const discountText = result.promoCodeType === 'percentage'
          ? `${result.promoCodeValue}%`
          : formatPrice(result.promoCodeValue || 0);
        
        toast.success(`Code promo appliqué ! Réduction de ${discountText}`);
      }
    } else {
      toast.error(result.errorMessage || 'Code promo invalide');
      setPromoDiscount(0);
      setPromoApplied(false);
      setPromoCodeId(null);
      setIsPostApplicationPromo(false);
    }
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const phoneDigits = normalizeMgPhoneDigits(shippingAddress.phone || '');
    const postalDigits = normalizeMgPostalCode(shippingAddress.postalCode || '');

    if (!isValidMgMobilePhone(phoneDigits)) {
      toast.error('Numéro de téléphone invalide. Utilisez 10 chiffres au format 03X XX XXX XX (ex. 034 12 345 67).');
      return;
    }
    if (!isValidMgPostalCodeOptional(postalDigits)) {
      toast.error('Code postal : uniquement des chiffres (3 à 5), ou laissez vide.');
      return;
    }

    if (
      shippingAddress.firstName &&
      shippingAddress.lastName &&
      shippingAddress.street &&
      shippingAddress.city &&
      phoneDigits
    ) {
      // Sauvegarder l'adresse et les instructions dans localStorage
      const addressToSave = {
        ...shippingAddress,
        phone: phoneDigits,
        postalCode: postalDigits,
        ...(deliveryInstructions.trim() && { deliveryInstructions: deliveryInstructions.trim() }),
      };
      setShippingAddress((prev) => ({ ...prev, phone: phoneDigits, postalCode: postalDigits }));
      localStorage.setItem('saved_shipping_address', JSON.stringify(addressToSave));
      setStep('payment');
    } else {
      toast.error('Veuillez remplir tous les champs obligatoires');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const phoneDigits = normalizeMgPhoneDigits(shippingAddress.phone || '');
    const postalDigits = normalizeMgPostalCode(shippingAddress.postalCode || '');

    if (!isValidMgMobilePhone(phoneDigits)) {
      toast.error('Numéro de téléphone invalide. Format : 03X XX XXX XX (10 chiffres).');
      setStep('shipping');
      return;
    }
    if (!isValidMgPostalCodeOptional(postalDigits)) {
      toast.error('Code postal : uniquement des chiffres (3 à 5), ou laissez vide.');
      setStep('shipping');
      return;
    }

    // Vérifier que l'adresse est complète
    if (
      !shippingAddress.firstName ||
      !shippingAddress.lastName ||
      !shippingAddress.street ||
      !shippingAddress.city ||
      !phoneDigits
    ) {
      toast.error('Veuillez remplir tous les champs obligatoires de l\'adresse');
      return;
    }

    // Vérifier qu'il y a des articles dans le panier
    if (items.length === 0) {
      toast.error('Votre panier est vide');
      return;
    }

    const refTrim = mobileMoneyPaymentReference.trim();
    if (refTrim.length < 3) {
      toast.error('Indiquez la référence de votre paiement Mobile Money (au moins 3 caractères).');
      return;
    }

    setIsSubmitting(true);

    try {
      // Préparer l'adresse complète pour la commande (avec instructions de livraison)
      const completeAddress: Address & { deliveryInstructions?: string } = {
        id: '',
        label: 'Adresse de livraison',
        firstName: shippingAddress.firstName!,
        lastName: shippingAddress.lastName!,
        street: shippingAddress.street!,
        city: shippingAddress.city!,
        postalCode: postalDigits,
        country: shippingAddress.country || 'Madagascar',
        phone: phoneDigits,
        ...(deliveryInstructions.trim() && { deliveryInstructions: deliveryInstructions.trim() }),
      };

      // Créer la commande dans Supabase (délai max 60 s pour éviter un bouton bloqué sans réponse)
      const order = await withTimeout(
        createOrder(
          user?.id || null,
          items,
          completeAddress,
          paymentMethod,
          subtotal,
          shippingCost,
          total,
          orderNumber,
          promoCodeId,
          promoDiscount > 0 ? promoDiscount : undefined,
          {
            operator: mobileMoneyOperator,
            paymentReference: refTrim,
          }
        ),
        60_000,
        'Délai dépassé : la commande n’a pas pu être confirmée. Vérifiez votre connexion et réessayez.'
      );

      try {
        if (promoCodeId && order.id) {
          if (isPostApplicationPromo) {
            await withTimeout(
              createRefund(
                order.id,
                promoCodeId,
                user?.id || null,
                promoDiscount
              ),
              45_000,
              'Délai dépassé lors de l’enregistrement du code promo.'
            );
          } else if (promoDiscount > 0) {
            await withTimeout(
              recordPromoCodeUsage(promoCodeId, user?.id || null, order.id, promoDiscount),
              45_000,
              'Délai dépassé lors de l’enregistrement du code promo.'
            );
          }
        }
      } catch (promoErr) {
        console.error('Erreur code promo après commande:', promoErr);
        toast.error(
          formatAppError(
            promoErr,
            'Commande enregistrée, mais le code promo n’a pas pu être finalisé. Conservez votre numéro de commande et contactez le support si besoin.'
          )
        );
      }

      clearCart();
      setStep('confirmation');
      toast.success('Commande confirmée !');
    } catch (error: unknown) {
      console.error('Erreur lors de la création de la commande:', error);
      toast.error(
        formatAppError(
          error,
          'Une erreur est survenue lors de la création de la commande. Veuillez réessayer.'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rediriger vers le panier si vide (sauf en confirmation)
  useEffect(() => {
    if (items.length === 0 && step !== 'confirmation') {
      navigate('/panier');
    }
  }, [items.length, step, navigate]);

  if (items.length === 0 && step !== 'confirmation') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        {step !== 'shipping' && (
          <button
            onClick={() => {
              if (step === 'payment') {
                setStep('shipping');
              } else {
                navigate('/panier');
              }
            }}
            className="p-2 rounded-lg hover:bg-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Retour"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-3xl font-heading font-bold text-text-dark">Commande</h1>
      </div>

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
                    inputMode="numeric"
                    autoComplete="postal-code"
                    pattern="[0-9]*"
                    placeholder="ex. 101"
                    value={shippingAddress.postalCode ?? ''}
                    onChange={(e) =>
                      setShippingAddress({
                        ...shippingAddress,
                        postalCode: normalizeMgPostalCode(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                  />
                  <p className="text-xs text-text-dark/60 mt-1">Chiffres uniquement (3 à 5), optionnel</p>
                </div>
              </div>
                <div className="mb-4">
                <label className="block text-sm font-medium text-text-dark mb-2">
                  Téléphone *
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  autoComplete="tel"
                  placeholder="034 12 345 67"
                  value={formatMgPhoneDisplay(shippingAddress.phone || '')}
                  onChange={(e) =>
                    setShippingAddress({
                      ...shippingAddress,
                      phone: normalizeMgPhoneDigits(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-text-dark/60 mt-1">
                  10 chiffres, format mobile : 03X XX XXX XX
                </p>
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
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-dark mb-2">
                  Indications de livraison (optionnelles mais fortement recommandées)
                </label>
                <textarea
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary resize-none"
                  placeholder="Ex: Appeler avant de livrer, code d'accès, étage, point de repère, etc."
                />
                <p className="text-xs text-text-dark/60 mt-1">
                  Ajoutez des indications précises pour faciliter la livraison
                </p>
              </div>
              <Button type="submit" variant="primary" size="lg" className="w-full">
                Continuer vers le paiement
              </Button>
            </form>
          )}

          {step === 'payment' && (
            <form onSubmit={handlePaymentSubmit} className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-2xl font-heading font-semibold text-text-dark mb-6">
                Paiement Mobile Money
              </h2>
              <p className="text-sm text-text-dark/80 mb-4">
                Choisissez votre opérateur, effectuez le paiement du montant indiqué dans le résumé
                vers le numéro affiché, puis saisissez la référence de transaction ci-dessous.
              </p>
              <fieldset className="mb-6 space-y-3">
                <legend className="text-sm font-medium text-text-dark mb-2">Opérateur *</legend>
                {MOBILE_MONEY_OPERATOR_IDS.map((id) => (
                  <label
                    key={id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors ${
                      mobileMoneyOperator === id
                        ? 'border-primary bg-primary/5'
                        : 'border-neutral-support hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mobile-money-operator"
                      value={id}
                      checked={mobileMoneyOperator === id}
                      onChange={() => setMobileMoneyOperator(id)}
                      className="mt-1 text-primary"
                    />
                    <div>
                      <p className="font-medium text-text-dark">{MOBILE_MONEY_OPERATORS[id].label}</p>
                      <p className="mt-1 font-mono text-sm text-text-dark">
                        {MOBILE_MONEY_OPERATORS[id].numberDisplay}
                      </p>
                    </div>
                  </label>
                ))}
              </fieldset>
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-text-dark">
                  Référence de paiement *
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={mobileMoneyPaymentReference}
                  onChange={(e) => setMobileMoneyPaymentReference(e.target.value)}
                  placeholder="Référence indiquée après votre paiement"
                  className="w-full rounded-lg border-2 border-neutral-support px-4 py-2 focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-xs text-text-dark/60">
                  Indiquez la référence communiquée par votre opérateur (SMS ou application).
                </p>
              </div>
              <Button 
                type="submit" 
                variant="primary" 
                size="lg" 
                className="w-full"
                disabled={isSubmitting || isCreatingOrder}
              >
                {isSubmitting || isCreatingOrder ? 'Traitement en cours...' : 'Confirmer la commande'}
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
                    <div className="w-16 h-16 rounded bg-neutral-support relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-neutral-support to-neutral-support/50 animate-pulse" aria-hidden="true" />
                      <img
                        src={normalizeImageApiUrl(item.product.images[0])}
                        alt={item.product.name}
                        className="w-full h-full object-cover relative z-10"
                        loading="lazy"
                        decoding="async"
                        onLoad={(e) => {
                          const placeholder = e.currentTarget.parentElement?.querySelector('.animate-pulse');
                          if (placeholder) {
                            placeholder.classList.add('opacity-0', 'transition-opacity', 'duration-300');
                          }
                        }}
                      />
                    </div>
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
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {promoApplied && discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Réduction</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-text-dark/80">
                  <span>Livraison</span>
                  <span className="text-text-dark/60 italic">En sus</span>
                </div>
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Le coût de livraison sera calculé et facturé séparément lors de la livraison.
                  </p>
                </div>
                <div className="flex justify-between text-lg font-bold text-text-dark pt-2 border-t border-neutral-support">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
              
              {/* Code promo */}
              {step === 'payment' && (
                <div className="mt-4 pt-4 border-t border-neutral-support">
                  <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Code promo"
                      disabled={promoApplied}
                      className="w-full min-w-0 flex-1 px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary disabled:opacity-50"
                    />
                    <Button
                      variant="outline"
                      onClick={handleApplyPromo}
                      disabled={promoApplied || !promoCode.trim() || isPromoLoading}
                      className="w-full shrink-0 sm:w-auto sm:whitespace-nowrap"
                    >
                      {isPromoLoading ? 'Vérification...' : promoApplied ? 'Appliqué' : 'Appliquer'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

