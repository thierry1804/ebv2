import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  return (
    <div className="space-y-4">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-light">
        <img
          src={images[selectedImage]}
          alt={productName}
          className="w-full h-full object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="relative">
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-md rounded-full p-1.5 transition-all duration-200"
              aria-label="Défiler vers la gauche"
            >
              <ChevronLeft className="w-5 h-5 text-text-dark" />
            </button>
          )}
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-hide"
          >
            <div className="flex gap-2 min-w-max">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    'aspect-square w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200',
                    selectedImage === index
                      ? 'border-secondary'
                      : 'border-transparent hover:border-primary'
                  )}
                >
                  <img
                    src={image}
                    alt={`${productName} - Vue ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-md rounded-full p-1.5 transition-all duration-200"
              aria-label="Défiler vers la droite"
            >
              <ChevronRight className="w-5 h-5 text-text-dark" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

