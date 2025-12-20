import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { ProductCard } from '../components/product/ProductCard';
import { Button } from '../components/ui/Button';
import { products, categories } from '../data/products';

export function Home() {
  const newArrivals = products.filter((p) => p.isNew).slice(0, 4);
  const bestSellers = products
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, 4);
  const saleItems = products.filter((p) => p.isOnSale).slice(0, 4);

  const heroSlides = [
    {
      title: 'Nouvelle Collection Printemps',
      subtitle: 'Découvrez nos dernières créations',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
      link: '/boutique?filter=new',
    },
    {
      title: 'Soldes d\'Été',
      subtitle: 'Jusqu\'à -50% sur une sélection d\'articles',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200',
      link: '/boutique?filter=sale',
    },
    {
      title: 'Mode Féminine Premium',
      subtitle: 'Élégance et sophistication',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200',
      link: '/boutique',
    },
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Slider */}
      <section className="relative h-[600px] overflow-hidden">
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative h-full">
            <img
              src={heroSlides[0].image}
              alt={heroSlides[0].title}
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
                  {heroSlides[0].title}
                </motion.h1>
                <motion.p
                  className="text-xl md:text-2xl mb-8"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {heroSlides[0].subtitle}
                </motion.p>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Link to={heroSlides[0].link}>
                    <Button size="lg" variant="primary">
                      Découvrir
                      <ChevronRight className="ml-2" size={20} />
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Catégories */}
      <section className="container mx-auto px-4">
        <h2 className="text-3xl font-heading font-bold text-text-dark mb-8 text-center">
          Nos Catégories
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

      {/* Nouvelles Arrivées */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-heading font-bold text-text-dark">Nouvelles Arrivées</h2>
          <Link
            to="/boutique?filter=new"
            className="flex items-center gap-2 text-secondary hover:text-accent transition-colors font-semibold"
          >
            Voir tout
            <ArrowRight size={20} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Best Sellers */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-heading font-bold text-text-dark">Best Sellers</h2>
          <Link
            to="/boutique"
            className="flex items-center gap-2 text-secondary hover:text-accent transition-colors font-semibold"
          >
            Voir tout
            <ArrowRight size={20} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Soldes */}
      {saleItems.length > 0 && (
        <section className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-heading font-bold text-text-dark">Soldes</h2>
            <Link
              to="/boutique?filter=sale"
              className="flex items-center gap-2 text-secondary hover:text-primary transition-colors font-medium"
            >
              Voir tout
              <ArrowRight size={20} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {saleItems.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Feed Instagram */}
      <section className="container mx-auto px-4">
        <h2 className="text-3xl font-heading font-bold text-text-dark mb-8 text-center">
          Suivez-nous sur Instagram
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square overflow-hidden rounded-lg bg-neutral-support"
            >
              <img
                src={`https://images.unsplash.com/photo-${1500000000000 + i}?w=400`}
                alt={`Instagram post ${i + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="container mx-auto px-4">
        <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-8 md:p-12 text-center border-2 border-primary/30">
          <h2 className="text-3xl font-heading font-bold text-text-dark mb-4">
            Restez informée de nos nouveautés
          </h2>
          <p className="text-text-dark/90 mb-6 max-w-md mx-auto font-medium">
            Inscrivez-vous à notre newsletter pour recevoir nos offres exclusives et être la première informée de nos nouvelles collections.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Votre adresse email"
              className="flex-1 px-4 py-3 rounded-lg border-2 border-secondary/30 focus:outline-none focus:border-secondary bg-white"
            />
            <Button variant="primary" size="lg">
              S'abonner
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}

