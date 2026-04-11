import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ImageZoom } from '../ui/ImageZoom';
import { normalizeImageApiUrl } from '../../lib/imageApi';

interface ProductGalleryProps {
  images: string[];
  productName: string;
  onImageChange?: (index: number) => void;
  selectedIndex?: number;
}

export function ProductGallery({ images, productName, onImageChange, selectedIndex }: ProductGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(selectedIndex ?? 0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mobileCarouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const selectedImageRef = useRef(selectedImage);
  const isAutomatedScrollRef = useRef(false);
  const scrollSyncTimeoutRef = useRef<number | null>(null);

  selectedImageRef.current = selectedImage;

  // Sync with controlled selectedIndex prop
  useEffect(() => {
    if (selectedIndex !== undefined && selectedIndex !== selectedImage) {
      setSelectedImage(selectedIndex);
    }
  }, [selectedIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeImage = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(images.length - 1, index));
      setSelectedImage(clamped);
      onImageChange?.(clamped);
    },
    [images.length, onImageChange],
  );

  const checkScrollability = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScrollability();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);
      return () => {
        container.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
  }, [images]);

  /** Aligne le carrousel mobile sur l’index courant (miniature, props, redimensionnement). */
  const scrollMobileCarouselToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const el = mobileCarouselRef.current;
      if (!el || images.length <= 1) return;
      const w = el.clientWidth;
      if (!w) return;
      const target = index * w;
      if (Math.abs(el.scrollLeft - target) < 6) return;
      isAutomatedScrollRef.current = true;
      el.scrollTo({ left: target, behavior });
      window.setTimeout(() => {
        isAutomatedScrollRef.current = false;
      }, 450);
    },
    [images.length],
  );

  useEffect(() => {
    scrollMobileCarouselToIndex(selectedImage, 'smooth');
  }, [selectedImage, scrollMobileCarouselToIndex]);

  /** Après resize du carrousel : recaler sans animation pour éviter les décalages. */
  useEffect(() => {
    const el = mobileCarouselRef.current;
    if (!el || images.length <= 1) return;

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (!w) return;
      isAutomatedScrollRef.current = true;
      el.scrollTo({ left: selectedImageRef.current * w, behavior: 'auto' });
      window.setTimeout(() => {
        isAutomatedScrollRef.current = false;
      }, 50);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [images.length]);

  const flushScrollIndex = useCallback(() => {
    const el = mobileCarouselRef.current;
    if (!el || images.length <= 1 || isAutomatedScrollRef.current) return;
    const w = el.clientWidth;
    if (!w) return;
    const idx = Math.round(el.scrollLeft / w);
    const clamped = Math.max(0, Math.min(images.length - 1, idx));
    if (clamped !== selectedImageRef.current) {
      changeImage(clamped);
    }
  }, [changeImage, images.length]);

  useEffect(() => {
    const el = mobileCarouselRef.current;
    if (!el || images.length <= 1) return;

    const onScroll = () => {
      if (scrollSyncTimeoutRef.current) window.clearTimeout(scrollSyncTimeoutRef.current);
      scrollSyncTimeoutRef.current = window.setTimeout(flushScrollIndex, 60);
    };

    const onScrollEnd = () => {
      if (scrollSyncTimeoutRef.current) window.clearTimeout(scrollSyncTimeoutRef.current);
      flushScrollIndex();
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('scrollend', onScrollEnd);
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('scrollend', onScrollEnd);
      if (scrollSyncTimeoutRef.current) window.clearTimeout(scrollSyncTimeoutRef.current);
    };
  }, [flushScrollIndex, images.length]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 100;
      const newScrollLeft =
        scrollContainerRef.current.scrollLeft +
        (direction === 'left' ? -scrollAmount : scrollAmount);
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, direction: 'left' | 'right') => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      scroll(direction);
    }
  };

  const handleThumbnailKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      changeImage(index);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      changeImage(index - 1);
    } else if (e.key === 'ArrowRight' && index < images.length - 1) {
      e.preventDefault();
      changeImage(index + 1);
    }
  };

  // Swipe discret sur la grande image desktop (pas utilisé sur le carrousel mobile natif)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && selectedImage < images.length - 1) {
      changeImage(selectedImage + 1);
    }
    if (isRightSwipe && selectedImage > 0) {
      changeImage(selectedImage - 1);
    }
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-4 lg:min-h-0">
      {/* Plusieurs images : un seul bloc racine pour éviter space-y sur l’image desktop (alignement avec la colonne produit) */}
      {images.length > 1 && (
        <div>
          {/* Mobile : bandeau horizontal type galerie Android (scroll + snap) */}
          <div className="min-w-0 max-w-full md:hidden">
            <div
              ref={mobileCarouselRef}
              className={cn(
                'flex aspect-square w-full min-w-0 touch-pan-x snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-lg bg-neutral-light',
                '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
                'overscroll-x-contain',
              )}
              role="region"
              aria-roledescription="carrousel"
              aria-label={`Photos de ${productName}, faire défiler horizontalement`}
            >
              {images.map((image, index) => (
                <div
                  key={index}
                  className="h-full w-full min-w-full shrink-0 snap-start overflow-hidden"
                >
                  <ImageZoom
                    src={normalizeImageApiUrl(image)}
                    alt={`${productName} - Vue ${index + 1} sur ${images.length}`}
                    className="h-full w-full object-cover select-none"
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
              {images.map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-200',
                    selectedImage === index ? 'w-5 bg-secondary' : 'w-1.5 bg-neutral-support',
                  )}
                />
              ))}
            </div>
          </div>

          {/* Desktop : image principale + swipe discret */}
          <div
            className="relative hidden aspect-square overflow-hidden rounded-lg bg-neutral-light md:block"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <ImageZoom
              src={normalizeImageApiUrl(images[selectedImage])}
              alt={`${productName} - Vue ${selectedImage + 1} sur ${images.length}`}
              className="h-full w-full object-cover select-none"
            />
          </div>
        </div>
      )}

      {/* Une seule image : même rendu sur tous les écrans */}
      {images.length === 1 && (
        <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-light md:block">
          <ImageZoom
            src={normalizeImageApiUrl(images[0])}
            alt={`${productName} - Photo`}
            className="h-full w-full object-cover select-none"
          />
        </div>
      )}

      {images.length > 1 && (
        <div className="relative min-w-0 max-w-full" role="group" aria-label="Galerie d'images du produit">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scroll('left')}
              onKeyDown={(e) => handleKeyDown(e, 'left')}
              className="absolute left-0 top-1/2 z-10 hidden min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-white/90 p-2 shadow-md transition-all duration-200 hover:bg-white focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 md:flex"
              aria-label="Faire défiler les miniatures vers la gauche"
            >
              <ChevronLeft className="h-5 w-5 text-text-dark" />
            </button>
          )}
          <div
            ref={scrollContainerRef}
            className="scrollbar-hide min-w-0 max-w-full overflow-x-auto"
            role="list"
            aria-label="Miniatures des images"
          >
            <div className="flex min-w-max gap-2">
              {images.map((image, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => changeImage(index)}
                  onKeyDown={(e) => handleThumbnailKeyDown(e, index)}
                  className={cn(
                    'aspect-square w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2',
                    selectedImage === index
                      ? 'border-secondary ring-2 ring-secondary ring-offset-1'
                      : 'border-transparent hover:border-primary',
                  )}
                  aria-label={`Voir l'image ${index + 1} de ${images.length}`}
                  aria-pressed={selectedImage === index}
                  role="button"
                  tabIndex={0}
                >
                  <img
                    src={normalizeImageApiUrl(image)}
                    alt={`${productName} - Vue ${index + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
          {canScrollRight && (
            <button
              type="button"
              onClick={() => scroll('right')}
              onKeyDown={(e) => handleKeyDown(e, 'right')}
              className="absolute right-0 top-1/2 z-10 hidden min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-white/90 p-2 shadow-md transition-all duration-200 hover:bg-white focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 md:flex"
              aria-label="Faire défiler les miniatures vers la droite"
            >
              <ChevronRight className="h-5 w-5 text-text-dark" />
            </button>
          )}
        </div>
      )}

      {/* Sur lg : étire la colonne pour égaler la hauteur avec la carte produit (grille align-items: stretch) */}
      <div className="hidden min-h-0 flex-1 lg:block" aria-hidden />
    </div>
  );
}
