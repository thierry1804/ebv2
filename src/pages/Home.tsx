import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { HeroSliderConfig, SectionConfig, InstagramConfig, NewsletterConfig, HeroSlide } from '../types';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';

export default function Home() {
  const { categories } = useCategories();
  const { products } = useProducts();
  const newArrivals = products.filter((p) => p.isNew).slice(0, 4);
  const bestSellers = products
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, 4);
  const saleItems = products.filter((p) => p.isOnSale).slice(0, 4);

  // États pour les configurations
  const [heroConfig, setHeroConfig] = useState<HeroSliderConfig | null>(null);
  const [categoriesConfig, setCategoriesConfig] = useState<SectionConfig | null>(null);
  const [newArrivalsConfig, setNewArrivalsConfig] = useState<SectionConfig | null>(null);
  const [bestSellersConfig, setBestSellersConfig] = useState<SectionConfig | null>(null);
  const [salesConfig, setSalesConfig] = useState<SectionConfig | null>(null);
  const [instagramConfig, setInstagramConfig] = useState<InstagramConfig | null>(null);
  const [newsletterConfig, setNewsletterConfig] = useState<NewsletterConfig | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

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

  // Gestion du carousel automatique
  useEffect(() => {
    if (!heroConfig || !heroConfig.autoplay) return;

    const interval = setInterval(() => {
      const activeSlides = heroConfig.slides.filter((s) => s.isActive);
      if (activeSlides.length > 0) {
        setCurrentSlideIndex((prev) => (prev + 1) % activeSlides.length);
      }
    }, heroConfig.autoplayInterval || 5000);

    return () => clearInterval(interval);
  }, [heroConfig]);

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
          }
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des configurations:', error);
    }
  };

  const heroSlides = heroConfig?.slides?.filter((s) => s.isActive) || defaultHeroSlides.filter((s) => s.isActive);
  const currentSlide = heroSlides[currentSlideIndex] || heroSlides[0];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Slider */}
      {currentSlide && (
        <section className="relative h-[600px] overflow-hidden">
          <motion.div
            key={currentSlideIndex}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative h-full">
              <img
                src={currentSlide.image}
                alt={currentSlide.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white px-4">
                  <motion.h1
                    className="text-5xl md:text-6xl font-heading font-bold mb-4"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {currentSlide.title}
                  </motion.h1>
                  <motion.p
                    className="text-xl md:text-2xl mb-8"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {currentSlide.subtitle}
                  </motion.p>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Link to={currentSlide.link}>
                      <Button size="lg" variant="primary">
                        {currentSlide.buttonText || 'Découvrir'}
                        <ChevronRight className="ml-2" size={20} />
                      </Button>
                    </Link>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
          {heroSlides.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlideIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlideIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                  aria-label={`Aller au slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Catégories */}
      {categoriesConfig && categoriesConfig.isVisible !== false && (
        <section className="container mx-auto px-4">
          <h2 className="text-3xl font-heading font-bold text-text-dark mb-8 text-center">
            {categoriesConfig?.title || 'Nos Catégories'}
          </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/boutique?category=${category.slug}`}
              className="group relative aspect-square overflow-hidden rounded-lg shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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

      {/* Nouvelles Arrivées */}
      {newArrivalsConfig?.isVisible !== false && (
        <section className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-heading font-bold text-text-dark">
              {newArrivalsConfig?.title || 'Nouvelles Arrivées'}
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
      {bestSellersConfig?.isVisible !== false && (
        <section className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-heading font-bold text-text-dark">
              {bestSellersConfig?.title || 'Best Sellers'}
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

      {/* Feed Instagram */}
      {instagramConfig && instagramConfig.isVisible !== false && (
        <section className="container mx-auto px-4">
          <h2 className="text-3xl font-heading font-bold text-text-dark mb-8 text-center">
            {instagramConfig?.title || 'Suivez-nous sur Instagram'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {(instagramConfig?.posts || Array.from({ length: 6 })).map((post: any, i: number) => (
              <a
                key={i}
                href={post?.link || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-square overflow-hidden rounded-lg bg-neutral-support"
              >
                <img
                  src={post?.image || `https://images.unsplash.com/photo-${1500000000000 + i}?w=400`}
                  alt={`Instagram post ${i + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Newsletter */}
      {newsletterConfig?.isVisible !== false && (
        <section className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-8 md:p-12 text-center border-2 border-primary/30">
            <h2 className="text-3xl font-heading font-bold text-text-dark mb-4">
              {newsletterConfig?.title || 'Restez informée de nos nouveautés'}
            </h2>
            <p className="text-text-dark/90 mb-6 max-w-md mx-auto font-medium">
              {newsletterConfig?.description || 'Inscrivez-vous à notre newsletter pour recevoir nos offres exclusives et être la première informée de nos nouvelles collections.'}
            </p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder={newsletterConfig?.placeholder || 'Votre adresse email'}
                className="flex-1 px-4 py-3 rounded-lg border-2 border-secondary/30 focus:outline-none focus:border-secondary bg-white"
              />
              <Button variant="primary" size="lg">
                {newsletterConfig?.buttonText || 'S\'abonner'}
              </Button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}

