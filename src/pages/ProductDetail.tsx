import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Heart, ShoppingCart, ArrowLeft, ExternalLink } from 'lucide-react';
import { ProductGallery } from '../components/product/ProductGallery';
import { SizeSelector } from '../components/product/SizeSelector';
import { ColorSelector } from '../components/product/ColorSelector';
import { QuantitySelector } from '../components/product/QuantitySelector';
import { Button } from '../components/ui/Button';
import { ProductCard } from '../components/product/ProductCard';
import { ReviewForm } from '../components/product/ReviewForm';
import { ReviewList } from '../components/product/ReviewList';
import { SocialShare } from '../components/product/SocialShare';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { formatPrice } from '../utils/formatters';
import { useProducts } from '../hooks/useProducts';
import toast from 'react-hot-toast';
import { SEO } from '../components/seo/SEO';
import { analytics } from '../hooks/useGoogleAnalytics';
import { useProductVariants } from '../hooks/useProductVariants';
import { areImageUrlsSameAsset, normalizeImageApiUrl, normalizeProductImageUrls } from '../lib/imageApi';
import { cn } from '../utils/cn';
import { ProductVariant, getVariantDisplayName } from '../types/variants';
import { ChatWidget } from '../components/chat/ChatWidget';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { products, reload: reloadProducts } = useProducts();

  const product = products.find((p) => p.id === id);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'composition' | 'sizes' | 'shipping' | 'reviews'>(
    'description'
  );
  const [reviewsKey, setReviewsKey] = useState(0); // Pour forcer le rechargement de ReviewList
  
  // État pour les variantes
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Hook pour les variantes
  const {
    variants,
    options: variantOptions,
    isLoading: isLoadingVariants,
    findVariant,
    getTotalStock,
    getPriceRange
  } = useProductVariants(id ?? null);

  // Détecte si les variantes sont basées sur les images (pas d'options classiques)
  const isImageVariants = useMemo(() => {
    if (!product?.hasVariants || variants.length === 0) return false;
    return variants.every(v => v.options.length === 0);
  }, [product?.hasVariants, variants]);

  // Prix / plage / stock : hooks toujours appelés (pas après un return) pour éviter l'erreur React #310
  const hasVariants = Boolean(product && product.hasVariants && variants.length > 0);

  /** Variante issue des options (taille, couleur…) — si plusieurs lignes partagent les mêmes options, findVariant renvoie toujours la première */
  const optionsBasedVariant = useMemo((): ProductVariant | null => {
    if (isImageVariants) return null;
    if (!product?.hasVariants || variantOptions.length === 0) return null;
    if (!variantOptions.every((opt) => selectedOptions[opt.id])) return null;
    return findVariant(selectedOptions);
  }, [isImageVariants, product?.hasVariants, variantOptions, selectedOptions, findVariant]);

  /**
   * Sous-galerie d’une variante : uniquement si elle a **plusieurs** photos propres.
   * (Une seule image par variante = cas admin « prix par photo » : on garde la galerie produit complète.)
   */
  const usesVariantOnlyGallery = useMemo(
    () =>
      Boolean(
        hasVariants &&
          !isImageVariants &&
          optionsBasedVariant &&
          optionsBasedVariant.images &&
          optionsBasedVariant.images.length > 1
      ),
    [hasVariants, isImageVariants, optionsBasedVariant]
  );

  const galleryImages = useMemo(() => {
    if (!product) return [];
    if (usesVariantOnlyGallery && optionsBasedVariant?.images?.length) {
      return optionsBasedVariant.images;
    }
    return product.images ?? [];
  }, [product, usesVariantOnlyGallery, optionsBasedVariant?.images]);

  /** Résout la ligne de variante pour la miniature active : URL puis position (= index galerie admin) */
  const resolveVariantForGalleryIndex = useCallback(
    (index: number, imageList: string[]): ProductVariant | null => {
      if (!variants.length || imageList.length === 0 || index < 0 || index >= imageList.length) {
        return null;
      }
      const raw = imageList[index];
      if (!raw) return null;
      const url = normalizeImageApiUrl(raw);
      const byUrl = variants.find((v) =>
        (v.images ?? []).some((img) => areImageUrlsSameAsset(img, url))
      );
      if (byUrl) return byUrl;
      return variants.find((v) => v.position === index) ?? null;
    },
    [variants]
  );

  // Variante sélectionnée par image (mode 100 % images, sans options)
  const imageVariant = useMemo((): ProductVariant | null => {
    if (!isImageVariants || variants.length === 0 || !product?.images?.length) return null;
    return resolveVariantForGalleryIndex(activeImageIndex, product.images);
  }, [isImageVariants, variants, activeImageIndex, product?.images, resolveVariantForGalleryIndex]);

  /** Variante alignée sur la photo affichée (indispensable quand toutes les lignes ont la même taille/couleur) */
  const variantResolvedByGallery = useMemo((): ProductVariant | null => {
    if (isImageVariants || !variants.length) return null;
    if (usesVariantOnlyGallery && optionsBasedVariant?.images?.length) {
      return resolveVariantForGalleryIndex(activeImageIndex, optionsBasedVariant.images);
    }
    if (!product?.images?.length) return null;
    return resolveVariantForGalleryIndex(activeImageIndex, product.images);
  }, [
    isImageVariants,
    variants.length,
    usesVariantOnlyGallery,
    optionsBasedVariant?.images,
    product?.images,
    activeImageIndex,
    resolveVariantForGalleryIndex,
  ]);

  const selectedVariant = useMemo((): ProductVariant | null => {
    if (isImageVariants) return imageVariant;
    return variantResolvedByGallery ?? optionsBasedVariant;
  }, [isImageVariants, imageVariant, variantResolvedByGallery, optionsBasedVariant]);

  /** Clic sur une miniature : met à jour l’index + options (taille / couleur) pour coller au prix « par photo » admin */
  const handleGalleryImageChange = useCallback(
    (index: number) => {
      setActiveImageIndex(index);
      if (!product?.images?.length || variants.length === 0) return;
      if (isImageVariants || usesVariantOnlyGallery) return;

      const raw = product.images[index];
      if (!raw) return;
      const url = normalizeImageApiUrl(raw);
      const matched = variants.find((v) =>
        (v.images ?? []).some((img) => areImageUrlsSameAsset(img, url))
      );
      if (!matched?.options?.length) return;

      setSelectedOptions((prev) => {
        const next = { ...prev };
        for (const o of matched.options) {
          next[o.optionId] = o.valueId;
        }
        return next;
      });
    },
    [product?.images, variants, isImageVariants, usesVariantOnlyGallery]
  );

  /** Index de miniature synchronisé avec le parent (variantes par image, ou options + galerie produit complète) */
  const galleryIndexControlled = Boolean(
    hasVariants &&
      (isImageVariants || (!usesVariantOnlyGallery && (product?.images?.length ?? 0) > 1))
  );

  const displayPrice = useMemo(() => {
    if (!product) return 0;
    if (hasVariants && selectedVariant) {
      return selectedVariant.price ?? product.price;
    }
    return product.salePrice || product.price;
  }, [product, hasVariants, selectedVariant]);

  const priceRange = useMemo(() => {
    if (!product) return { min: 0, max: 0 };
    if (hasVariants) {
      return getPriceRange(product.price);
    }
    return { min: product.price, max: product.price };
  }, [product, hasVariants, getPriceRange]);

  const currentStock = useMemo(() => {
    if (!product) return 0;
    if (hasVariants) {
      if (selectedVariant) {
        // Variantes "par image" (admin: simple checkbox dispo/rupture) :
        // on ne limite pas artificiellement à 1 côté front.
        if (isImageVariants) {
          return selectedVariant.isAvailable && selectedVariant.stock > 0 ? 99 : 0;
        }
        return selectedVariant.stock;
      }
      return getTotalStock();
    }
    return product.stock;
  }, [product, hasVariants, selectedVariant, getTotalStock, isImageVariants]);

  const prevUsesVariantOnlyGalleryRef = useRef(usesVariantOnlyGallery);
  useEffect(() => {
    if (galleryImages.length === 0) {
      setActiveImageIndex(0);
      return;
    }
    if (prevUsesVariantOnlyGalleryRef.current !== usesVariantOnlyGallery) {
      prevUsesVariantOnlyGalleryRef.current = usesVariantOnlyGallery;
      setActiveImageIndex(0);
      return;
    }
    setActiveImageIndex((i) => Math.min(i, galleryImages.length - 1));
  }, [galleryImages.length, usesVariantOnlyGallery]);

  // Suivre la vue du produit avec Google Analytics (après displayPrice)
  // IMPORTANT : avant tout return conditionnel
  useEffect(() => {
    if (product) {
      analytics.viewProduct(product.id, product.name, displayPrice);
    }
  }, [product?.id, product?.name, displayPrice]);

  // Réinitialiser taille / couleur / variantes / quantité à chaque changement de produit (évite IDs d’options obsolètes)
  useLayoutEffect(() => {
    setSelectedOptions({});
    setSelectedSize(null);
    setSelectedColor(null);
    setQuantity(1);
    setActiveImageIndex(0);
  }, [id]);

  // Pré-sélectionner une variante par défaut (priorité : en stock) pour afficher prix / stock cohérents
  useEffect(() => {
    if (!product?.hasVariants || isImageVariants || isLoadingVariants) return;
    if (variantOptions.length === 0 || variants.length === 0) return;

    setSelectedOptions((prev) => {
      const cleaned = Object.fromEntries(
        Object.entries(prev).filter(([key]) => variantOptions.some((o) => o.id === key))
      );

      const allFilled = variantOptions.every((o) => cleaned[o.id]);
      if (allFilled) {
        const unchanged =
          variantOptions.every((o) => prev[o.id] === cleaned[o.id]) &&
          Object.keys(prev).length === variantOptions.length;
        return unchanged ? prev : cleaned;
      }

      const noneFilled = variantOptions.every((o) => !cleaned[o.id]);
      if (!noneFilled) return cleaned;

      const matchesOptionCount = (v: ProductVariant) => v.options.length === variantOptions.length;
      const pick =
        variants.find((v) => matchesOptionCount(v) && v.isAvailable && v.stock > 0) ||
        variants.find((v) => matchesOptionCount(v) && v.isAvailable) ||
        variants.find(matchesOptionCount) ||
        null;
      if (!pick) return cleaned;

      const next: Record<string, string> = { ...cleaned };
      for (const o of pick.options) {
        next[o.optionId] = o.valueId;
      }
      return next;
    });
  }, [product?.hasVariants, isImageVariants, isLoadingVariants, variantOptions, variants]);

  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(1, q), Math.max(currentStock, 1)));
  }, [currentStock]);

  // Auto-sélectionner la première couleur de la variante (ou du produit sans variantes)
  useEffect(() => {
    const variantColors = selectedVariant?.colors;
    if (variantColors && variantColors.length > 0) {
      setSelectedColor(variantColors[0].name);
    } else if (!hasVariants && product?.colors && product.colors.length > 0) {
      const first = product.colors[0];
      const name = typeof first === 'string' ? first : first.name;
      if (name) setSelectedColor(name);
    }
  }, [selectedVariant?.id, selectedVariant?.colors, hasVariants, product?.colors]);

  // Pour les variantes-images : est-ce que la variante active est en stock ?
  // null = l'image active n'est pas une variante (galerie seulement)
  const imageVariantInStock = isImageVariants
    ? (imageVariant ? imageVariant.isAvailable && imageVariant.stock > 0 : null)
    : null;

  /** Éviter le double message quand le bloc « variante par image » couvre déjà l’indisponibilité */
  const showShopOutOfStockBanner =
    currentStock <= 0 && !(isImageVariants && imageVariant);
  const activeGalleryImageUrl =
    galleryImages.length > 0
      ? normalizeImageApiUrl(galleryImages[Math.min(activeImageIndex, galleryImages.length - 1)] || '')
      : undefined;

  /** Lien « Commander sur Duo Import » — avant tout return pour respecter l’ordre des Hooks. */
  const duoImportHref = useMemo(() => {
    if (!product) {
      return 'https://duoimport.mg/commande-import?h=';
    }
    const variantColor = selectedVariant?.colors?.[0]?.name ?? null;
    const resolvedColor = variantColor || selectedColor || undefined;
    const imgUrl =
      activeGalleryImageUrl ||
      (selectedVariant?.images?.[0] ? normalizeImageApiUrl(selectedVariant.images[0]) : '') ||
      (imageVariant?.images?.[0] ? normalizeImageApiUrl(imageVariant.images[0]) : '') ||
      (product.images?.[0] ? normalizeImageApiUrl(product.images[0]) : '') ||
      '';
    const data = JSON.stringify({
      img: imgUrl,
      qty: quantity,
      color: resolvedColor,
      name: product.name,
      price: displayPrice,
    });
    return `https://duoimport.mg/commande-import?h=${btoa(encodeURIComponent(data))}`;
  }, [
    product,
    activeGalleryImageUrl,
    selectedVariant,
    imageVariant,
    quantity,
    displayPrice,
    selectedColor,
  ]);

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-xl text-text-dark/80 mb-4">Produit non trouvé</p>
        <Link to="/boutique">
          <Button variant="outline">Retour à la boutique</Button>
        </Link>
      </div>
    );
  }

  const hasSale = product.isOnSale && product.salePrice;
  const inWishlist = isInWishlist(product.id);

  // Produits similaires
  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const handleAddToCart = () => {
    // Résoudre la couleur : couleur de la variante > couleur sélectionnée manuellement
    const variantColor = selectedVariant?.colors?.[0]?.name ?? null;
    const resolvedColor = variantColor || selectedColor;

    // Vérifier la sélection de couleur uniquement pour les produits sans variantes
    if (!hasVariants && !isImageVariants && product.colors && product.colors.length > 0 && !resolvedColor) {
      toast.error('Veuillez sélectionner une couleur');
      return;
    }

    // Pour les variantes-images
    if (isImageVariants) {
      if (imageVariant) {
        // L'image active correspond à une variante achetable
        if (!imageVariant.isAvailable || imageVariant.stock === 0) {
          toast.error('Ce modèle est en rupture de stock');
          return;
        }
        addItem(
          product,
          null,
          resolvedColor,
          quantity,
          imageVariant.id,
          imageVariant.sku,
          [{ name: 'Modèle', value: `Image ${activeImageIndex + 1}` }],
          displayPrice,
          activeGalleryImageUrl || imageVariant.images?.[0] || product.images?.[0]
        );
        analytics.addToCart(product.id, product.name, displayPrice, quantity);
        toast.success('Produit ajouté au panier');
      } else {
        // L'image active est une image galerie — ajouter le produit de base
        addItem(product, selectedSize, resolvedColor, quantity);
        analytics.addToCart(product.id, product.name, displayPrice, quantity);
        toast.success('Produit ajouté au panier');
      }
      return;
    }

    // Si le produit a des variantes classiques
    if (hasVariants) {
      const missingOptions = variantOptions.filter(opt => !selectedOptions[opt.id]);
      if (missingOptions.length > 0) {
        toast.error(`Veuillez sélectionner: ${missingOptions.map(o => o.name).join(', ')}`);
        return;
      }

      if (!selectedVariant) {
        toast.error('Cette combinaison n\'est pas disponible');
        return;
      }

      if (!selectedVariant.isAvailable || selectedVariant.stock === 0) {
        toast.error('Cette variante est en rupture de stock');
        return;
      }

      addItem(
        product,
        null,
        resolvedColor,
        quantity,
        selectedVariant.id,
        selectedVariant.sku,
        selectedVariant.options.map(o => ({ name: o.optionName, value: o.value })),
        displayPrice,
        activeGalleryImageUrl || selectedVariant.images?.[0] || product.images?.[0]
      );
      analytics.addToCart(product.id, product.name, displayPrice, quantity);
      toast.success('Produit ajouté au panier');
      return;
    }

    // Logique originale pour les produits sans variantes
    const hasSizes = product.sizes && product.sizes.length > 0;

    if (hasSizes && !selectedSize) {
      toast.error('Veuillez sélectionner une taille');
      return;
    }

    addItem(product, selectedSize, resolvedColor, quantity);
    analytics.addToCart(product.id, product.name, displayPrice, quantity);
    toast.success('Produit ajouté au panier');
  };

  const productImage =
    product.images && product.images.length > 0 ? normalizeImageApiUrl(product.images[0]) : '';
  const productDescription = product.description || `${product.name} - Mode féminine haut de gamme disponible sur ByValsue`;

  return (
    <>
      <SEO
        title={product.name}
        description={productDescription}
        keywords={`${product.name}, ${product.category}, mode féminine, ByValsue, Madagascar`}
        image={productImage}
        url={`/produit/${product.id}`}
        type="product"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: productDescription,
          image: normalizeProductImageUrls(product.images || []),
          brand: {
            '@type': 'Brand',
            name: 'ByValsue',
          },
          offers: {
            '@type': 'Offer',
            url: `https://eshopbyvalsue.mg/produit/${product.id}`,
            priceCurrency: 'MGA',
            price: displayPrice.toString(),
            availability:
              currentStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition',
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating.toString(),
            reviewCount: product.reviewCount.toString(),
          },
        }}
      />
      <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <div className="mb-6 text-sm text-text-dark/80">
        <Link to="/" className="hover:text-secondary transition-colors">
          Accueil
        </Link>
        <span className="mx-2">/</span>
        <Link to="/boutique" className="hover:text-secondary transition-colors">
          Boutique
        </Link>
        <span className="mx-2">/</span>
        <span className="text-text-dark font-medium">{product.name}</span>
      </div>

      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-text-dark/80 hover:text-secondary transition-colors"
      >
        <ArrowLeft size={20} />
        Retour
      </button>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-stretch mb-1">
        {/* Galerie */}
        <div className="min-w-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
          <div className="min-h-0 w-full lg:flex lg:flex-1 lg:flex-col">
          <ProductGallery
            images={galleryImages}
            productName={product.name}
            onImageChange={
              galleryIndexControlled
                ? isImageVariants
                  ? setActiveImageIndex
                  : handleGalleryImageChange
                : undefined
            }
            selectedIndex={galleryIndexControlled ? activeImageIndex : undefined}
          />
          </div>
        </div>

        {/* Informations — même rayon que la galerie (rounded-lg), hauteur alignée sur lg */}
        <div className="min-w-0 flex flex-col lg:h-full lg:min-h-0 lg:pl-2">
          <div className="flex min-h-0 flex-col rounded-lg border border-neutral-support/25 bg-white p-6 shadow-sm sm:p-8 lg:h-full">
          <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {product.isNew && (
              <span className="inline-block rounded-md bg-accent px-3 py-1 text-sm font-medium text-white">
                Nouveau
              </span>
            )}
            {hasSale && (
              <span className="inline-block rounded-md bg-secondary px-3 py-1 text-sm font-medium text-white">
                En solde
              </span>
            )}
          </div>

          <h1 className="mb-3 font-heading text-3xl font-bold leading-tight tracking-tight text-text-dark sm:text-4xl">
            {product.name}
          </h1>

          {/* Note et avis */}
          <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-neutral-support/20 pb-5">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={18}
                  className={
                    i < Math.floor(product.rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }
                />
              ))}
            </div>
            <span className="text-sm text-text-dark/65">
              {product.rating.toFixed(1)} ({product.reviewCount} avis)
            </span>
          </div>

          {/* Prix */}
          <div className="mb-8 rounded-xl bg-neutral-support/8 px-4 py-4 sm:px-5 sm:py-5">
            {hasVariants && !selectedVariant ? (
              <span className="text-3xl font-bold tracking-tight text-text-dark sm:text-4xl">
                {priceRange.min === priceRange.max 
                  ? formatPrice(priceRange.min)
                  : `${formatPrice(priceRange.min)} - ${formatPrice(priceRange.max)}`
                }
              </span>
            ) : (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {hasSale && !hasVariants && (
                  <span className="text-lg text-neutral-support line-through sm:text-xl">
                    {formatPrice(product.price)}
                  </span>
                )}
                {selectedVariant?.compareAtPrice && (
                  <span className="text-lg text-neutral-support line-through sm:text-xl">
                    {formatPrice(selectedVariant.compareAtPrice)}
                  </span>
                )}
                <span className={`text-3xl font-bold tracking-tight sm:text-4xl ${hasSale || selectedVariant?.compareAtPrice ? 'text-secondary' : 'text-text-dark'}`}>
                  {formatPrice(displayPrice)}
                </span>
              </div>
            )}
          </div>

          {/* Sélecteurs */}
          <div className="mb-0 space-y-6">
            {/* Sélecteurs de variantes (si le produit a des variantes) */}
            {hasVariants && variantOptions.length > 0 && (
              <>
                {variantOptions.map((option) => (
                  <div key={option.id}>
                    <label className="block text-sm font-medium text-text-dark mb-2">
                      {option.name}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {option.values.map((value) => {
                        const isSelected = selectedOptions[option.id] === value.id;
                        const isColor = !!value.hexColor;
                        
                        return (
                          <button
                            key={value.id}
                            onClick={() => {
                              setSelectedOptions(prev => ({
                                ...prev,
                                [option.id]: value.id
                              }));
                            }}
                            className={`
                              ${isColor 
                                ? `w-10 h-10 rounded-full border-2 transition-all ${
                                    isSelected 
                                      ? 'ring-2 ring-offset-2 ring-secondary border-secondary' 
                                      : 'border-gray-300 hover:border-gray-400'
                                  }`
                                : `px-4 py-2 rounded-lg border-2 transition-all ${
                                    isSelected 
                                      ? 'border-secondary bg-secondary/10 text-secondary font-medium' 
                                      : 'border-gray-300 hover:border-gray-400'
                                  }`
                              }
                            `}
                            style={isColor ? { backgroundColor: value.hexColor } : undefined}
                            title={value.value}
                          >
                            {!isColor && value.value}
                          </button>
                        );
                      })}
                    </div>
                    {selectedOptions[option.id] && (
                      <p className="mt-2 text-sm text-green-600 font-medium">
                        ✓ {option.name}: {option.values.find(v => v.id === selectedOptions[option.id])?.value}
                      </p>
                    )}
                  </div>
                ))}
                
                {/* Info variante sélectionnée */}
                {selectedVariant && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Variante :</span> {getVariantDisplayName(selectedVariant)}
                      {selectedVariant.sku && (
                        <span className="text-gray-500 ml-2">(SKU: {selectedVariant.sku})</span>
                      )}
                    </p>
                  </div>
                )}
              </>
            )}
            
            {/* Info variante-image : naviguer dans la galerie pour choisir */}
            {isImageVariants && (
              <div className={cn(
                'p-3 rounded-lg border',
                imageVariant
                  ? (imageVariantInStock ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200')
                  : 'bg-blue-50 border-blue-200'
              )}>
                <p className="text-sm text-gray-800">
                  Parcourez les images pour choisir le modèle exact que vous souhaitez.
                  {imageVariant ? (
                    imageVariantInStock ? (
                      <span className="block mt-1 font-medium text-green-700">
                        Ce modèle est disponible.
                      </span>
                    ) : (
                      <span className="block mt-1 font-medium text-amber-700">
                        Ce modèle est indisponible — commandez-le sur Duo Import.
                      </span>
                    )
                  ) : (
                    <span className="block mt-1 text-gray-500 italic">
                      Cette image est une vue du produit.
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Sélecteur de taille (produits sans variantes uniquement) */}
            {!hasVariants && product.sizes && product.sizes.length > 0 && (
              <div>
                <SizeSelector
                  sizes={product.sizes}
                  selectedSize={selectedSize}
                  onSelectSize={setSelectedSize}
                />
                {selectedSize && (
                  <p className="mt-2 text-sm text-green-600 font-medium">
                    ✓ Taille {selectedSize} sélectionnée
                  </p>
                )}
              </div>
            )}

            {/* Couleurs : variante sélectionnée > couleurs produit */}
            {(() => {
              const variantColors = selectedVariant?.colors;
              const productColors = product.colors;
              const colorsToShow = (variantColors && variantColors.length > 0)
                ? variantColors
                : (!hasVariants && productColors && productColors.length > 0)
                  ? productColors
                  : null;
              if (!colorsToShow) return null;
              return (
                <div>
                  <ColorSelector
                    colors={colorsToShow}
                    selectedColor={selectedColor}
                    onSelectColor={setSelectedColor}
                  />
                  {selectedColor && (
                    <p className="mt-2 text-sm text-green-600 font-medium">
                      ✓ Couleur {selectedColor} sélectionnée
                    </p>
                  )}
                </div>
              );
            })()}

            {showShopOutOfStockBanner && (
              <div className="rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-orange-50/60 px-4 py-4 sm:px-5">
                <p className="font-heading text-base font-semibold text-amber-950">
                  Indisponible sur la boutique
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-amber-900/90">
                  {hasVariants && !selectedVariant
                    ? 'Choisissez une autre variante si elle est en stock, ou commandez ce modèle chez Duo Import via le bouton ci-dessous.'
                    : 'Ce modèle n’est pas en stock sur ByValsue. Vous pouvez le commander auprès de notre partenaire Duo Import.'}
                </p>
              </div>
            )}

            {currentStock > 0 && (
              <>
                <QuantitySelector
                  quantity={quantity}
                  onIncrease={() => setQuantity((q) => q + 1)}
                  onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
                  max={currentStock}
                  stockStatus="in_stock"
                />
                {currentStock <= 5 && !isImageVariants && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                    <p className="text-sm font-medium text-yellow-900">
                      Il ne reste que {currentStock} exemplaire{currentStock > 1 ? 's' : ''} en stock.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          </div>

          {/* Actions */}
          <div className="mt-auto flex shrink-0 flex-col gap-3 border-t border-neutral-support/20 pt-4 sm:flex-row sm:items-stretch">
            {currentStock <= 0 ? (
              <a
                href={duoImportHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 sm:text-lg"
              >
                <ExternalLink size={20} className="shrink-0" aria-hidden />
                Commander sur Duo Import
              </a>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={handleAddToCart}
                className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl shadow-sm"
              >
                <ShoppingCart size={20} />
                Ajouter au panier
              </Button>
            )}
            <button
              type="button"
              onClick={() => {
                toggleWishlist(product);
                toast.success(
                  inWishlist ? 'Retiré de la wishlist' : 'Ajouté à la wishlist'
                );
              }}
              className={cn(
                'flex min-h-[52px] min-w-[52px] shrink-0 items-center justify-center rounded-xl border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 sm:self-auto',
                inWishlist
                  ? 'border-secondary bg-secondary text-white'
                  : 'border-neutral-support text-text-dark hover:border-primary'
              )}
              aria-label={inWishlist ? 'Retirer de la wishlist' : 'Ajouter à la wishlist'}
            >
              <Heart size={24} fill={inWishlist ? 'currentColor' : 'none'} />
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Partage réseaux sociaux */}
      <div className="mb-8">
        <SocialShare
          productName={product.name}
          productUrl={`/produit/${product.id}`}
          productImage={
            product.images && product.images.length > 0
              ? normalizeImageApiUrl(product.images[0])
              : undefined
          }
          productDescription={product.description}
        />
      </div>

      {/* Onglets */}
      <div className="border-t border-neutral-support pt-6">
        <div className="flex gap-4 mb-6 border-b border-neutral-support">
          {[
            { id: 'description', label: 'Description' },
            { id: 'composition', label: 'Composition & Entretien' },
            { id: 'sizes', label: 'Guide tailles' },
            { id: 'shipping', label: 'Livraison & Retours' },
            { id: 'reviews', label: 'Avis' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-secondary border-b-2 border-secondary'
                  : 'text-text-dark/80 hover:text-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-text-dark/80">
          {activeTab === 'description' && (
            <div>
              <p className="mb-4">{product.description}</p>
            </div>
          )}
          {activeTab === 'composition' && (
            <div>
              <p className="mb-2">
                <strong>Composition :</strong> {product.composition}
              </p>
              <p>
                <strong>Entretien :</strong> Lavage à la main recommandé. Ne pas utiliser de
                javel. Repasser à basse température.
              </p>
            </div>
          )}
          {activeTab === 'sizes' && (
            <div>
              <p className="mb-4">
                <strong>Guide des tailles :</strong>
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-support">
                    <th className="text-left py-2">Taille</th>
                    <th className="text-left py-2">Tour de poitrine</th>
                    <th className="text-left py-2">Tour de taille</th>
                    <th className="text-left py-2">Tour de hanches</th>
                  </tr>
                </thead>
                <tbody>
                  {['XS', 'S', 'M', 'L', 'XL'].map((size) => (
                    <tr key={size} className="border-b border-neutral-support/50">
                      <td className="py-2 font-medium">{size}</td>
                      <td className="py-2">80-84 cm</td>
                      <td className="py-2">60-64 cm</td>
                      <td className="py-2">88-92 cm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'shipping' && (
            <div>
              <p className="mb-4">
                <strong>Livraison :</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 mb-6">
                <li>Livraison gratuite à partir de 200 000 Ar</li>
                <li>Délai de livraison : 3-5 jours ouvrés</li>
                <li>Livraison disponible dans toute l'île de Madagascar</li>
              </ul>
              <p className="mb-4">
                <strong>Retours :</strong>
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Retours gratuits sous 14 jours</li>
                <li>Articles non portés, avec étiquettes</li>
                <li>Remboursement ou échange possible</li>
              </ul>
            </div>
          )}
          {activeTab === 'reviews' && (
            <div className="space-y-8">
              <ReviewForm
                productId={product.id}
                onReviewSubmitted={async () => {
                  // Rafraîchir les produits pour mettre à jour les notes
                  await reloadProducts();
                  // Forcer le rechargement de la liste des avis
                  setReviewsKey((prev) => prev + 1);
                }}
              />
              <ReviewList productId={product.id} refreshKey={reviewsKey} />
            </div>
          )}
        </div>
      </div>

      {/* Produits similaires */}
      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="text-3xl font-heading font-bold text-text-dark mb-8">
            Vous aimerez aussi
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>

    {/* Chat en temps réel */}
    <ChatWidget
      productId={product.id}
      productName={product.name}
      productImage={product.images?.[0] ? normalizeImageApiUrl(product.images[0]) : null}
    />
    </>
  );
}

