import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { HeroSlide } from '../../types';

interface HeroSliderProps {
  slides: HeroSlide[];
  autoplay?: boolean;
  autoplayInterval?: number;
  height?: string;
}

export function HeroSlider({
  slides,
  autoplay = true,
  autoplayInterval = 5000,
  height = '600px',
}: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeSlides = slides.filter((s) => s.isActive);
  const totalSlides = activeSlides.length;

  // Navigation
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Autoplay
  useEffect(() => {
    if (!autoplay || isPaused || totalSlides <= 1) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      goToNext();
    }, autoplayInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoplay, autoplayInterval, isPaused, totalSlides, goToNext]);

  // Navigation au clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious]);

  // Gestion du swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  if (totalSlides === 0) {
    return null;
  }

  const currentSlide = activeSlides[currentIndex];

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden"
      style={{ height }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={currentIndex}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          <div className="relative h-full w-full">
            <img
              src={currentSlide.image}
              alt={currentSlide.title}
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60"></div>
            
            {/* Contenu du slide */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white px-4 max-w-4xl mx-auto">
                <motion.h1
                  className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-4"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                >
                  {currentSlide.title}
                </motion.h1>
                <motion.p
                  className="text-lg md:text-xl lg:text-2xl mb-8 font-light"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  {currentSlide.subtitle}
                </motion.p>
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  <Link to={currentSlide.link}>
                    <Button
                      size="lg"
                      variant="primary"
                      className="whitespace-nowrap bg-gradient-to-r from-accent to-secondary hover:from-accent/90 hover:to-secondary/90 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 px-8 py-4 text-lg font-semibold"
                    >
                      {currentSlide.buttonText || 'Découvrir'}
                      <ChevronRight className="ml-2 inline-block" size={20} />
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Boutons de navigation */}
      {totalSlides > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-all duration-300 hover:scale-110"
            aria-label="Slide précédent"
          >
            <ChevronLeft size={24} className="text-white" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-all duration-300 hover:scale-110"
            aria-label="Slide suivant"
          >
            <ChevronRight size={24} className="text-white" />
          </button>
        </>
      )}

      {/* Indicateurs de navigation (dots) */}
      {totalSlides > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {activeSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentIndex
                  ? 'w-8 h-2 bg-white'
                  : 'w-2 h-2 bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Aller au slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Indicateur de pause/play (optionnel) */}
      {autoplay && totalSlides > 1 && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-white">
            {isPaused ? '⏸ Pause' : '▶ Lecture'}
          </div>
        </div>
      )}
    </section>
  );
}

