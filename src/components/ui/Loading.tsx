export function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  return (
    <div className={`flex items-center justify-center p-8 ${className}`} role="status" aria-label="Chargement en cours">
      <div className="relative">
        <div className={`${sizeClasses[size]} border-4 border-gray-200 rounded-full`}></div>
        <div className={`${sizeClasses[size]} border-4 border-secondary border-t-transparent rounded-full animate-spin absolute top-0 left-0`}></div>
      </div>
      <span className="sr-only">Chargement en cours</span>
    </div>
  );
}

// Spinner moderne avec animation de pulsation
export function ModernSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 ${className}`} role="status" aria-label="Chargement en cours">
      <div className="relative w-16 h-16">
        {/* Cercle externe */}
        <div className="absolute inset-0 border-4 border-secondary/20 rounded-full"></div>
        {/* Cercle animé */}
        <div className="absolute inset-0 border-4 border-transparent border-t-secondary border-r-secondary rounded-full animate-spin" style={{ animationDuration: '0.8s' }}></div>
        {/* Cercle interne avec pulsation */}
        <div className="absolute inset-2 border-4 border-secondary/40 rounded-full animate-pulse"></div>
        {/* Point central */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-secondary rounded-full"></div>
      </div>
      <p className="mt-6 text-text-dark/70 font-medium animate-pulse">Chargement des produits...</p>
    </div>
  );
}

// Alias pour compatibilité
export const Loading = LoadingSpinner;

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-neutral-support rounded ${className}`} aria-hidden="true"></div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm" aria-label="Chargement du produit">
      <Skeleton className="w-full aspect-square" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-6 w-1/3" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

