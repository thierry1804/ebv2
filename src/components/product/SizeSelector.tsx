import { cn } from '../../utils/cn';

interface SizeSelectorProps {
  sizes: string[];
  selectedSize: string | null;
  onSelectSize: (size: string) => void;
  availableSizes?: string[];
}

export function SizeSelector({
  sizes,
  selectedSize,
  onSelectSize,
  availableSizes,
}: SizeSelectorProps) {
  const isAvailable = (size: string) => {
    if (!availableSizes) return true;
    return availableSizes.includes(size);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-text-dark mb-2">Taille</label>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const available = isAvailable(size);
          return (
            <button
              key={size}
              onClick={() => available && onSelectSize(size)}
              disabled={!available}
              className={cn(
                'px-4 py-2 rounded-lg border-2 transition-all duration-200 font-semibold shadow-sm min-h-[44px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2',
                selectedSize === size
                  ? 'border-secondary bg-secondary text-white shadow-md'
                  : 'border-neutral-support text-text-dark hover:border-secondary hover:bg-secondary/10',
                !available && 'opacity-50 cursor-not-allowed line-through'
              )}
              aria-label={`Taille ${size}${!available ? ' - Non disponible' : selectedSize === size ? ' - Sélectionnée' : ''}`}
              aria-pressed={selectedSize === size}
            >
              {size}
            </button>
          );
        })}
      </div>
    </div>
  );
}

