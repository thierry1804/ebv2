import { cn } from '../../utils/cn';

interface ColorSelectorProps {
  colors: string[];
  selectedColor: string | null;
  onSelectColor: (color: string) => void;
}

const colorMap: Record<string, string> = {
  Noir: 'bg-gray-900',
  Blanc: 'bg-white border-2 border-gray-300',
  Rose: 'bg-pink-300',
  Beige: 'bg-amber-100',
  Crème: 'bg-amber-50',
  Marine: 'bg-blue-900',
  Bordeaux: 'bg-red-900',
  Nude: 'bg-rose-200',
  Rouge: 'bg-red-600',
  Doré: 'bg-yellow-400',
  Argenté: 'bg-gray-400',
  Turquoise: 'bg-cyan-400',
  Marron: 'bg-amber-800',
  Bleu: 'bg-blue-500',
  Fleur: 'bg-gradient-to-br from-pink-300 to-purple-300',
  Tortue: 'bg-amber-700',
};

export function ColorSelector({
  colors,
  selectedColor,
  onSelectColor,
}: ColorSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-dark mb-2">Couleur</label>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => onSelectColor(color)}
            className={cn(
              'w-10 h-10 rounded-full border-2 transition-all duration-200 shadow-sm',
              colorMap[color] || 'bg-gray-300',
              selectedColor === color
                ? 'border-secondary scale-110 ring-2 ring-secondary ring-offset-2 shadow-md'
                : 'border-gray-300 hover:border-secondary hover:scale-105'
            )}
            aria-label={color}
            title={color}
          />
        ))}
      </div>
    </div>
  );
}

