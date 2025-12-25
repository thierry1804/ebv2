import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ImageZoom } from '../ui/ImageZoom';

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

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
      setSelectedImage(index);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      setSelectedImage(index - 1);
    } else if (e.key === 'ArrowRight' && index < images.length - 1) {
      e.preventDefault();
      setSelectedImage(index + 1);
    }
  };

  // Gestion du swipe pour mobile
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
      setSelectedImage(selectedImage + 1);
    }
    if (isRightSwipe && selectedImage > 0) {
      setSelectedImage(selectedImage - 1);
    }
  };

  return (
    <div className="space-y-4">
      <div 
        className="relative aspect-square overflow-hidden rounded-lg bg-neutral-light"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <ImageZoom
          src={images[selectedImage]}
          alt={`${productName} - Vue ${selectedImage + 1} sur ${images.length}`}
          className="w-full h-full object-cover select-none"
        />
      </div>
      {images.length > 1 && (
        <div className="relative" role="group" aria-label="Galerie d'images du produit">
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              onKeyDown={(e) => handleKeyDown(e, 'left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-md rounded-full p-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Image précédente"
            >
              <ChevronLeft className="w-5 h-5 text-text-dark" />
            </button>
          )}
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-hide"
            role="list"
            aria-label="Miniatures des images"
          >
            <div className="flex gap-2 min-w-max">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  onKeyDown={(e) => handleThumbnailKeyDown(e, index)}
                  className={cn(
                    'aspect-square w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2',
                    selectedImage === index
                      ? 'border-secondary ring-2 ring-secondary ring-offset-1'
                      : 'border-transparent hover:border-primary'
                  )}
                  aria-label={`Voir l'image ${index + 1} de ${images.length}`}
                  aria-pressed={selectedImage === index}
                  role="button"
                  tabIndex={0}
                >
                  <img
                    src={image}
                    alt={`${productName} - Vue ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              onKeyDown={(e) => handleKeyDown(e, 'right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-md rounded-full p-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Image suivante"
            >
              <ChevronRight className="w-5 h-5 text-text-dark" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

