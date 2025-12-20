import { cn } from '../../utils/cn';
import { getColorHex } from '../../config/colors';

interface ColorSelectorProps {
  colors: string[];
  selectedColor: string | null;
  onSelectColor: (color: string) => void;
}

export function ColorSelector({
  colors,
  selectedColor,
  onSelectColor,
}: ColorSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-dark mb-2">Couleur</label>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => {
          const colorHex = getColorHex(color);
          const isWhite = colorHex === '#ecf0f1' || colorHex === '#FFFFFF' || color === 'Blanc';
          
          return (
            <button
              key={color}
              onClick={() => onSelectColor(color)}
              className={cn(
                'w-10 h-10 rounded-full border-2 transition-all duration-200 shadow-sm',
                isWhite && 'border-gray-300',
                selectedColor === color
                  ? 'border-secondary scale-110 ring-2 ring-secondary ring-offset-2 shadow-md'
                  : 'border-gray-300 hover:border-secondary hover:scale-105'
              )}
              style={{ backgroundColor: colorHex }}
              aria-label={color}
              title={color}
            />
          );
        })}
      </div>
    </div>
  );
}

