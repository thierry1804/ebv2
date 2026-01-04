import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { HeroSliderConfig, SectionConfig, InstagramConfig, NewsletterConfig, FeaturedContentConfig, HeroSlide } from '../types';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { HeroSlider } from '../components/hero/HeroSlider';
import { SEO } from '../components/seo/SEO';

export default function Home() {
  const { categories } = useCategories();
  const { products } = useProducts();
  
  // Calcul des produits avec priorités pour éviter les doublons
  // Priorité : Soldes > Nouvelle arrivée > Best seller
  const { saleItems, newArrivals, bestSellers } = useMemo(() => {
    // 1. Soldes (priorité la plus haute)
    const sales = products.filter((p) => p.isOnSale).slice(0, 4);
    const salesIds = new Set(sales.map((p) => p.id));
    
    // 2. Nouvelles arrivées (excluant les produits déjà en solde)
    const newArr = products
      .filter((p) => p.isNew && !salesIds.has(p.id))
      .slice(0, 4);
    const newArrIds = new Set(newArr.map((p) => p.id));
    
    // 3. Best sellers (excluant les produits déjà en solde ou nouvelles arrivées)
    const bestSell = products
      .filter((p) => !salesIds.has(p.id) && !newArrIds.has(p.id))
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, 4);
    
    return {
      saleItems: sales,
      newArrivals: newArr,
      bestSellers: bestSell,
    };
  }, [products]);

  // États pour les configurations
  const [heroConfig, setHeroConfig] = useState<HeroSliderConfig | null>(null);
  const [categoriesConfig, setCategoriesConfig] = useState<SectionConfig | null>(null);
  const [newArrivalsConfig, setNewArrivalsConfig] = useState<SectionConfig | null>(null);
  const [bestSellersConfig, setBestSellersConfig] = useState<SectionConfig | null>(null);
  const [salesConfig, setSalesConfig] = useState<SectionConfig | null>(null);
  const [instagramConfig, setInstagramConfig] = useState<InstagramConfig | null>(null);
  const [newsletterConfig, setNewsletterConfig] = useState<NewsletterConfig | null>(null);
  const [featuredContentConfig, setFeaturedContentConfig] = useState<FeaturedContentConfig | null>(null);

  // Valeurs par défaut
  const defaultHeroSlides: HeroSlide[] = [
    {
      title: 'Nouvelle Collection Printemps',
      subtitle: 'Découvrez nos dernières créations',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
      link: '/boutique?filter=new',
      buttonText: 'Découvrir',
      isActive: true,
    },
    {
      title: 'Soldes d\'Été',
      subtitle: 'Jusqu\'à -50% sur une sélection d\'articles',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200',
      link: '/boutique?filter=sale',
      buttonText: 'Découvrir',
      isActive: true,
    },
    {
      title: 'Mode Féminine Premium',
      subtitle: 'Élégance et sophistication',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200',
      link: '/boutique',
      buttonText: 'Découvrir',
      isActive: true,
    },
  ];

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      // Réinitialiser toutes les configs à null
      setHeroConfig(null);
      setCategoriesConfig(null);
      setNewArrivalsConfig(null);
      setBestSellersConfig(null);
      setSalesConfig(null);
      setInstagramConfig(null);
      setNewsletterConfig(null);
      setFeaturedContentConfig(null);

      // Charger toutes les configs pour vérifier is_active
      const { data, error } = await supabase
        .from('landing_page_config')
        .select('*');

      if (error) {
        console.warn('Erreur lors du chargement des configurations:', error);
        return;
      }

      if (data) {
        data.forEach((config) => {
          // Ne charger que si la section est active
          if (!config.is_active) return;

          switch (config.section_key) {
            case 'hero.slider':
              setHeroConfig(config.config_data as HeroSliderConfig);
              break;
            case 'categories':
              setCategoriesConfig(config.config_data as SectionConfig);
              break;
            case 'new_arrivals':
              setNewArrivalsConfig(config.config_data as SectionConfig);
              break;
            case 'best_sellers':
              setBestSellersConfig(config.config_data as SectionConfig);
              break;
            case 'sales':
              setSalesConfig(config.config_data as SectionConfig);
              break;
            case 'instagram':
              setInstagramConfig(config.config_data as InstagramConfig);
              break;
            case 'newsletter':
              setNewsletterConfig(config.config_data as NewsletterConfig);
              break;
            case 'featured_content':
              setFeaturedContentConfig(config.config_data as FeaturedContentConfig);
              break;
          }
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des configurations:', error);
    }
  };

  const heroSlides = heroConfig?.slides?.filter((s) => s.isActive) || defaultHeroSlides.filter((s) => s.isActive);

  return (
    <>
      <SEO
        title="Accueil"
        description="Découvrez ByValsue, votre boutique en ligne de mode féminine haut de gamme à Madagascar. Collections exclusives de vêtements, accessoires, chaussures et bijoux."
        keywords="mode féminine, boutique en ligne, Madagascar, vêtements, accessoires, mode haut de gamme, ByValsue, nouvelles collections"
        url="/"
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Eshop ByValsue',
          url: 'https://eshopbyvalsue.mg',
          description: 'Boutique en ligne malgache de mode féminine haut de gamme',
          potentialAction: {
            '@type': 'SearchAction',
            target: 'https://eshopbyvalsue.mg/boutique?search={search_term_string}',
            'query-input': 'required name=search_term_string',
          },
        }}
      />
      <div className="space-y-16 pb-16">
      {/* Hero Slider */}
      {heroSlides.length > 0 && (
        <div className="-mt-20 md:-mt-24">
          <HeroSlider
            slides={heroSlides}
            autoplay={heroConfig?.autoplay !== false}
            autoplayInterval={heroConfig?.autoplayInterval || 5000}
            height="calc(600px + 80px)"
          />
        </div>
      )}

      {/* H1 pour le SEO - visible mais discret */}
      <div className="container mx-auto px-4">
        <h1 className="sr-only">ByValsue - Mode Féminine Haut de Gamme à Madagascar</h1>
      </div>

      {/* Catégories */}
      {categoriesConfig && categoriesConfig.isVisible !== false && categories.length > 0 && (
        <section className="container mx-auto px-4 mt-40">
          <h2 className="text-3xl font-heading font-bold text-text-dark mb-8 text-center">
            {categoriesConfig?.title || 'Nos Catégories'}
          </h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 6)}, 1fr)` }}>
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/boutique?category=${category.slug}`}
                className="group relative aspect-square overflow-hidden rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 bg-neutral-support"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-support to-neutral-support/50 animate-pulse" aria-hidden="true" />
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 relative z-10"
                  loading="lazy"
                  decoding="async"
                  onLoad={(e) => {
                    const placeholder = e.currentTarget.parentElement?.querySelector('.animate-pulse');
                    if (placeholder) {
                      placeholder.classList.add('opacity-0', 'transition-opacity', 'duration-300');
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                  <h3 className="text-white font-heading font-semibold p-4 text-lg">
                    {category.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Soldes */}
      {salesConfig?.isVisible !== false && saleItems.length > 0 && (
        <section className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-heading font-bold text-text-dark">
              {salesConfig?.title || 'Soldes'}
            </h2>
            {salesConfig?.seeAllLink && (
              <Link
                to={salesConfig.seeAllLink}
                className="flex items-center gap-2 text-secondary hover:text-primary transition-colors font-medium"
              >
                {salesConfig.seeAllText || 'Voir tout'}
                <ArrowRight size={20} />
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {saleItems.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Nouvelles Arrivées */}
      {newArrivalsConfig?.isVisible !== false && newArrivals.length > 0 && (
        <section className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-heading font-bold text-text-dark">
              {newArrivalsConfig?.title || 'Nouvelles arrivées'}
            </h2>
            {newArrivalsConfig?.seeAllLink && (
              <Link
                to={newArrivalsConfig.seeAllLink}
                className="flex items-center gap-2 text-secondary hover:text-accent transition-colors font-semibold"
              >
                {newArrivalsConfig.seeAllText || 'Voir tout'}
                <ArrowRight size={20} />
              </Link>
            )}
          </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
      )}

      {/* Best Sellers */}
      {bestSellersConfig?.isVisible !== false && bestSellers.length > 0 && (
        <section className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-heading font-bold text-text-dark">
              {bestSellersConfig?.title || 'Best sellers'}
            </h2>
            {bestSellersConfig?.seeAllLink && (
              <Link
                to={bestSellersConfig.seeAllLink}
                className="flex items-center gap-2 text-secondary hover:text-accent transition-colors font-semibold"
              >
                {bestSellersConfig.seeAllText || 'Voir tout'}
                <ArrowRight size={20} />
              </Link>
            )}
          </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
      )}

      {/* Feed Instagram */}
      {instagramConfig && instagramConfig.isVisible !== false && instagramConfig?.posts && instagramConfig.posts.length > 0 && (
        <section className="container mx-auto px-4">
          <h2 className="text-3xl font-heading font-bold text-text-dark mb-8 text-center">
            {instagramConfig?.title || 'Suivez-nous sur Instagram'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {instagramConfig.posts.map((post: any, i: number) => (
              <a
                key={i}
                href={post?.link || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-square overflow-hidden rounded-lg bg-neutral-support relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-support to-neutral-support/50 animate-pulse" aria-hidden="true" />
                <img
                  src={post?.image || `https://images.unsplash.com/photo-${1500000000000 + i}?w=400`}
                  alt={`Instagram post ${i + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 relative z-10"
                  loading="lazy"
                  decoding="async"
                  onLoad={(e) => {
                    const placeholder = e.currentTarget.parentElement?.querySelector('.animate-pulse');
                    if (placeholder) {
                      placeholder.classList.add('opacity-0', 'transition-opacity', 'duration-300');
                    }
                  }}
                />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Contenu mis en avant */}
      {featuredContentConfig && featuredContentConfig.isVisible !== false && (
        <section className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-8 md:p-12 border-2 border-primary/30">
            <div className={`flex flex-col ${featuredContentConfig.image ? 'md:flex-row' : ''} items-center gap-8`}>
              {featuredContentConfig.image && (
                <div className="flex-shrink-0 w-full md:w-1/2">
                  <img
                    src={featuredContentConfig.image}
                    alt={featuredContentConfig.title}
                    className="w-full h-auto rounded-lg shadow-lg object-cover"
                  />
                </div>
              )}
              <div className={`flex-1 text-center ${featuredContentConfig.image ? 'md:text-left' : ''}`}>
                <h2 className="text-3xl font-heading font-bold text-text-dark mb-4">
                  {featuredContentConfig.title}
                </h2>
                <p className="text-text-dark/90 mb-6 max-w-2xl mx-auto font-medium">
                  {featuredContentConfig.description}
                </p>
                {featuredContentConfig.buttonText && featuredContentConfig.buttonLink && (
                  <div className="flex justify-center md:justify-start">
                    <Link to={featuredContentConfig.buttonLink}>
                      <Button variant="primary" size="lg">
                        {featuredContentConfig.buttonText}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
    </>
  );
}

