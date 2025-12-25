export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8" role="status" aria-label="Chargement en cours">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" aria-hidden="true"></div>
      <span className="sr-only">Chargement en cours</span>
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

