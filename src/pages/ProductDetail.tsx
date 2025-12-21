import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Heart, ShoppingCart, ArrowLeft } from 'lucide-react';
import { ProductGallery } from '../components/product/ProductGallery';
import { SizeSelector } from '../components/product/SizeSelector';
import { ColorSelector } from '../components/product/ColorSelector';
import { QuantitySelector } from '../components/product/QuantitySelector';
import { Button } from '../components/ui/Button';
import { ProductCard } from '../components/product/ProductCard';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { formatPrice } from '../utils/formatters';
import { useProducts } from '../hooks/useProducts';
import toast from 'react-hot-toast';
import { SEO } from '../components/seo/SEO';
import { analytics } from '../hooks/useGoogleAnalytics';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { products } = useProducts();

  const product = products.find((p) => p.id === id);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'composition' | 'sizes' | 'shipping'>(
    'description'
  );

  // Suivre la vue du produit avec Google Analytics
  // IMPORTANT: Ce hook doit être appelé AVANT tout return conditionnel
  useEffect(() => {
    if (product) {
      const displayPrice = product.salePrice || product.price;
      analytics.viewProduct(product.id, product.name, displayPrice);
    }
  }, [product?.id, product?.name, product?.salePrice, product?.price]);

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

  const displayPrice = product.salePrice || product.price;
  const hasSale = product.isOnSale && product.salePrice;
  const inWishlist = isInWishlist(product.id);

  // Produits similaires
  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const handleAddToCart = () => {
    // Vérifier uniquement les attributs qui existent pour le produit
    const hasSizes = product.sizes && product.sizes.length > 0;
    const hasColors = product.colors && product.colors.length > 0;
    
    if (hasSizes && !selectedSize) {
      toast.error('Veuillez sélectionner une taille');
      return;
    }
    
    if (hasColors && !selectedColor) {
      toast.error('Veuillez sélectionner une couleur');
      return;
    }

    addItem(product, selectedSize, selectedColor, quantity);
    analytics.addToCart(product.id, product.name, displayPrice, quantity);
    toast.success('Produit ajouté au panier');
  };

  const productImage = product.images && product.images.length > 0 ? product.images[0] : '';
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
          image: product.images || [],
          brand: {
            '@type': 'Brand',
            name: 'ByValsue',
          },
          offers: {
            '@type': 'Offer',
            url: `https://eshopbyvalsue.mg/produit/${product.id}`,
            priceCurrency: 'MGA',
            price: displayPrice.toString(),
            availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        {/* Galerie */}
        <div>
          <ProductGallery images={product.images} productName={product.name} />
        </div>

        {/* Informations */}
        <div>
          <div className="mb-4">
            {product.isNew && (
              <span className="inline-block bg-accent text-white px-3 py-1 rounded text-sm font-medium mb-2">
                Nouveau
              </span>
            )}
            {hasSale && (
              <span className="inline-block bg-secondary text-white px-3 py-1 rounded text-sm font-medium mb-2 ml-2">
                En solde
              </span>
            )}
          </div>

          <h1 className="text-4xl font-heading font-bold text-text-dark mb-4">
            {product.name}
          </h1>

          {/* Note et avis */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1">
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
            <span className="text-text-dark/80">
              {product.rating.toFixed(1)} ({product.reviewCount} avis)
            </span>
          </div>

          {/* Prix */}
          <div className="mb-6">
            {hasSale && (
              <span className="text-xl text-neutral-support line-through mr-2">
                {formatPrice(product.price)}
              </span>
            )}
            <span className={`text-3xl font-bold ${hasSale ? 'text-secondary' : 'text-text-dark'}`}>
              {formatPrice(displayPrice)}
            </span>
          </div>

          {/* Sélecteurs */}
          <div className="space-y-6 mb-8">
            {product.sizes && product.sizes.length > 0 && (
              <SizeSelector
                sizes={product.sizes}
                selectedSize={selectedSize}
                onSelectSize={setSelectedSize}
              />
            )}
            {product.colors && product.colors.length > 0 && (
              <ColorSelector
                colors={product.colors}
                selectedColor={selectedColor}
                onSelectColor={setSelectedColor}
              />
            )}
            <QuantitySelector
              quantity={quantity}
              onIncrease={() => setQuantity((q) => q + 1)}
              onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
              max={product.stock}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 mb-8">
            <Button
              variant="primary"
              size="lg"
              onClick={handleAddToCart}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <ShoppingCart size={20} />
              Ajouter au panier
            </Button>
            <button
              onClick={() => {
                toggleWishlist(product);
                toast.success(
                  inWishlist ? 'Retiré de la wishlist' : 'Ajouté à la wishlist'
                );
              }}
              className={`p-4 rounded-lg border-2 transition-colors ${
                inWishlist
                  ? 'border-secondary bg-secondary text-white'
                  : 'border-neutral-support text-text-dark hover:border-primary'
              }`}
              aria-label={inWishlist ? 'Retirer de la wishlist' : 'Ajouter à la wishlist'}
            >
              <Heart size={24} fill={inWishlist ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Stock */}
          <p className="text-sm text-text-dark/80 mb-8">
            {product.stock > 0 ? (
              <span className="text-green-600">En stock ({product.stock} disponible{product.stock > 1 ? 's' : ''})</span>
            ) : (
              <span className="text-red-600">Rupture de stock</span>
            )}
          </p>

          {/* Onglets */}
          <div className="border-t border-neutral-support pt-6">
            <div className="flex gap-4 mb-6 border-b border-neutral-support">
              {[
                { id: 'description', label: 'Description' },
                { id: 'composition', label: 'Composition & Entretien' },
                { id: 'sizes', label: 'Guide tailles' },
                { id: 'shipping', label: 'Livraison & Retours' },
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
            </div>
          </div>
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
    </>
  );
}

