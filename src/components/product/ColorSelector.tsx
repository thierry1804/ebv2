import { cn } from '../../utils/cn';
import { getColorHex, getColorHexValue, normalizeColors, ColorWithHex } from '../../config/colors';

interface ColorSelectorProps {
  colors: string[] | ColorWithHex[];
  selectedColor: string | null;
  onSelectColor: (color: string) => void;
}

export function ColorSelector({
  colors,
  selectedColor,
  onSelectColor,
}: ColorSelectorProps) {
  // Normaliser les couleurs pour garantir qu'on a toujours ColorWithHex[]
  const normalizedColors = normalizeColors(colors);
  
  return (
    <div>
      <label className="block text-sm font-medium text-text-dark mb-2">Couleur</label>
      <div className="flex flex-wrap gap-2">
        {normalizedColors.map((color) => {
          const colorHex = color.hex;
          const colorName = color.name;
          const isWhite = colorHex === '#ecf0f1' || colorHex === '#FFFFFF' || colorHex === '#ffffff' || colorName === 'Blanc';
          
          return (
            <button
              key={colorName}
              onClick={() => onSelectColor(colorName)}
              className={cn(
                'w-10 h-10 rounded-full border-2 transition-all duration-200 shadow-sm',
                isWhite && 'border-gray-300',
                selectedColor === colorName
                  ? 'border-secondary scale-110 ring-2 ring-secondary ring-offset-2 shadow-md'
                  : 'border-gray-300 hover:border-secondary hover:scale-105'
              )}
              style={{ backgroundColor: colorHex }}
              aria-label={colorName}
              title={colorName}
            />
          );
        })}
      </div>
    </div>
  );
}

