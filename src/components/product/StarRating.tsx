import { Star } from 'lucide-react';
import { cn } from '../../utils/cn';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 18,
  interactive = false,
  onRatingChange,
  className,
}: StarRatingProps) {
  const handleClick = (index: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(index + 1);
    }
  };

  const handleMouseEnter = (index: number) => {
    if (interactive) {
      // Optionnel : effet visuel au survol
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {Array.from({ length: maxRating }).map((_, i) => {
        const isFilled = i < Math.floor(rating);
        const isHalfFilled = i === Math.floor(rating) && rating % 1 >= 0.5;
        const isActive = interactive && i < rating;

        return (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(i)}
            onMouseEnter={() => handleMouseEnter(i)}
            disabled={!interactive}
            className={cn(
              'transition-colors',
              interactive && 'cursor-pointer hover:scale-110',
              !interactive && 'cursor-default'
            )}
            aria-label={`${i + 1} étoile${i + 1 > 1 ? 's' : ''}`}
          >
            <Star
              size={size}
              className={cn(
                isFilled || isHalfFilled || isActive
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300',
                interactive && 'transition-transform'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

