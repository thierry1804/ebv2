import { Share2, Facebook, Twitter, MessageCircle, Mail } from 'lucide-react';

interface SocialShareProps {
  productName: string;
  productUrl: string;
  productImage?: string;
  productDescription?: string;
}

export function SocialShare({ productName, productUrl, productImage, productDescription }: SocialShareProps) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://eshopbyvalsue.mg';
  const fullUrl = `${baseUrl}${productUrl}`;
  const shareText = `${productName} - Découvrez ce produit sur ByValsue`;
  const shareDescription = productDescription || shareText;

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareToWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${fullUrl}`)}`;
    window.open(url, '_blank');
  };

  const shareByEmail = () => {
    const subject = encodeURIComponent(`Découvrez ${productName} sur ByValsue`);
    const body = encodeURIComponent(`${shareDescription}\n\n${fullUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareNative = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function') {
      try {
        const shareData: ShareData = {
          title: productName,
          text: shareDescription,
          url: fullUrl,
        };
        
        // Ajouter l'image si disponible (supporté par certains navigateurs)
        if (productImage && 'canShare' in navigator) {
          try {
            const response = await fetch(productImage);
            const blob = await response.blob();
            const file = new File([blob], 'product-image.jpg', { type: blob.type });
            const testShareData = { ...shareData, files: [file] };
            
            // Vérifier si le partage avec fichiers est supporté
            if (navigator.canShare && navigator.canShare(testShareData)) {
              shareData.files = [file];
            }
          } catch (err) {
            // Si l'image ne peut pas être chargée, continuer sans elle
            console.warn('Impossible de charger l\'image pour le partage:', err);
          }
        }
        
        await navigator.share(shareData);
      } catch (err) {
        // L'utilisateur a annulé le partage
        if ((err as Error).name !== 'AbortError') {
          console.error('Erreur lors du partage:', err);
        }
      }
    } else {
      // Fallback : copier le lien dans le presse-papier
      if (navigator.clipboard) {
        navigator.clipboard.writeText(fullUrl);
      }
    }
  };

  const shareButtons = [
    {
      id: 'facebook',
      label: 'Facebook',
      icon: Facebook,
      onClick: shareToFacebook,
      color: 'bg-[#1877F2]',
      hoverColor: 'hover:bg-[#166FE5]',
      shadowColor: 'hover:shadow-[#1877F2]/20',
    },
    {
      id: 'twitter',
      label: 'Twitter',
      icon: Twitter,
      onClick: shareToTwitter,
      color: 'bg-[#1DA1F2]',
      hoverColor: 'hover:bg-[#1A91DA]',
      shadowColor: 'hover:shadow-[#1DA1F2]/20',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      onClick: shareToWhatsApp,
      color: 'bg-[#25D366]',
      hoverColor: 'hover:bg-[#22C55E]',
      shadowColor: 'hover:shadow-[#25D366]/20',
    },
    {
      id: 'email',
      label: 'Email',
      icon: Mail,
      onClick: shareByEmail,
      color: 'bg-gradient-to-br from-text-dark via-text-dark/95 to-text-dark/90',
      hoverColor: 'hover:from-text-dark hover:via-text-dark hover:to-text-dark',
      shadowColor: 'hover:shadow-text-dark/15',
    },
  ];

  if (typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function') {
    shareButtons.push({
      id: 'native',
      label: 'Plus',
      icon: Share2,
      onClick: shareNative,
      color: 'bg-white border-2 border-neutral-support/50',
      hoverColor: 'hover:border-primary hover:bg-neutral-light',
      shadowColor: 'hover:shadow-primary/10',
    });
  }

  return (
    <div className="border-t border-neutral-support/30 border-b border-neutral-support/30 py-6 mt-6">
      <div className="flex flex-wrap gap-2 items-center">
        {shareButtons.map((button) => {
          const Icon = button.icon;
          const isNative = button.id === 'native';
          
          return (
            <button
              key={button.id}
              onClick={button.onClick}
              className={`
                group relative
                w-10 h-10
                ${button.color}
                ${button.hoverColor}
                ${button.shadowColor}
                ${isNative ? 'text-text-dark' : 'text-white'}
                rounded-xl
                transition-all duration-300 ease-out
                shadow-sm hover:shadow-md
                hover:-translate-y-0.5
                active:translate-y-0 active:scale-95
                overflow-hidden
              `}
              aria-label={`Partager sur ${button.label}`}
              title={button.label}
            >
              {/* Effet de brillance au survol */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/0 group-hover:from-white/10 group-hover:via-white/5 group-hover:to-white/0 transition-all duration-500" />
              
              {/* Icône centrée */}
              <div className="relative h-full flex items-center justify-center">
                <Icon 
                  size={18} 
                  className={`
                    transition-all duration-300
                    ${isNative ? 'group-hover:text-primary group-hover:rotate-12' : 'group-hover:scale-110'}
                  `}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

