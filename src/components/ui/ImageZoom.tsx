import { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ImageZoomProps {
  src: string;
  alt: string;
  className?: string;
}

export function ImageZoom({ src, alt, className }: ImageZoomProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(2);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isZoomed) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isZoomed]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel((prev) => Math.max(1, Math.min(4, prev + delta)));
  };

  if (!isZoomed) {
    return (
      <div 
        className="relative group w-full h-full"
        onClick={(e) => {
          e.stopPropagation();
          setIsZoomed(true);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsZoomed(true);
          }
        }}
        aria-label="Cliquez pour zoomer l'image"
      >
        <img
          src={src}
          alt={alt}
          className={cn('cursor-zoom-in w-full h-full', className)}
          loading="lazy"
          draggable={false}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
          <ZoomIn className="text-white drop-shadow-lg" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
      onClick={() => setIsZoomed(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Zoom de l'image"
    >
      <div
        ref={containerRef}
        className="relative w-full h-full max-w-7xl max-h-[90vh] m-4"
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button
            onClick={() => setZoomLevel((prev) => Math.max(1, prev - 0.5))}
            className="bg-white/90 hover:bg-white text-text-dark p-2 rounded-lg shadow-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-secondary"
            aria-label="Réduire le zoom"
          >
            <ZoomOut size={20} />
          </button>
          <button
            onClick={() => setZoomLevel((prev) => Math.min(4, prev + 0.5))}
            className="bg-white/90 hover:bg-white text-text-dark p-2 rounded-lg shadow-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-secondary"
            aria-label="Augmenter le zoom"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={() => setIsZoomed(false)}
            className="bg-white/90 hover:bg-white text-text-dark p-2 rounded-lg shadow-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-secondary"
            aria-label="Fermer le zoom"
          >
            <X size={20} />
          </button>
        </div>
        <div
          className="w-full h-full overflow-hidden"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: `${zoomLevel * 100}%`,
            backgroundPosition: `${position.x}% ${position.y}%`,
            backgroundRepeat: 'no-repeat',
          }}
        >
          <img
            ref={imageRef}
            src={src}
            alt={alt}
            className="w-full h-full object-contain opacity-0"
            draggable={false}
          />
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 text-text-dark px-4 py-2 rounded-lg shadow-lg text-sm">
          Zoom: {Math.round(zoomLevel * 100)}% • Cliquez pour fermer • Molette pour zoomer
        </div>
      </div>
    </div>
  );
}

