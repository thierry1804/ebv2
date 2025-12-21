// Configuration des couleurs prédéfinies
// Utilisée à la fois dans l'admin et le frontend

export interface ColorDefinition {
  name: string;
  hex: string;
  dark: boolean;
}

export const predefinedColors: ColorDefinition[] = [
  { name: 'Noir', hex: '#2c3e50', dark: true },
  { name: 'Blanc', hex: '#ecf0f1', dark: false },
  { name: 'Bleu Océan', hex: '#3498db', dark: false },
  { name: 'Rouge Passion', hex: '#e74c3c', dark: false },
  { name: 'Vert Forêt', hex: '#27ae60', dark: false },
  { name: 'Jaune Soleil', hex: '#f39c12', dark: false },
  { name: 'Rose Poudré', hex: '#fd79a8', dark: false },
  { name: 'Violet Royal', hex: '#9b59b6', dark: false },
  { name: 'Gris Chiné', hex: '#95a5a6', dark: false },
  { name: 'Marine', hex: '#34495e', dark: true },
  { name: 'Beige', hex: '#F5F5DC', dark: false },
  { name: 'Marron', hex: '#8B4513', dark: true },
  { name: 'Orange', hex: '#F97316', dark: false },
  { name: 'Turquoise', hex: '#14B8A6', dark: false },
  { name: 'Bordeaux', hex: '#991B1B', dark: true },
  { name: 'Kaki', hex: '#84CC16', dark: false },
];

// Mapping pour retrouver rapidement une couleur par son nom
export const colorMapByName: Record<string, ColorDefinition> = predefinedColors.reduce(
  (acc, color) => {
    acc[color.name] = color;
    return acc;
  },
  {} as Record<string, ColorDefinition>
);

// Fonction pour obtenir le hex d'une couleur par son nom
export function getColorHex(colorName: string): string {
  return colorMapByName[colorName]?.hex || '#CCCCCC';
}

// Type pour une couleur avec son code hexadécimal
export interface ColorWithHex {
  name: string;
  hex: string;
}

// Fonction pour normaliser les couleurs (string[] ou ColorWithHex[]) en ColorWithHex[]
export function normalizeColors(colors: string[] | ColorWithHex[]): ColorWithHex[] {
  if (!colors || colors.length === 0) return [];
  
  // Vérifier si c'est un tableau de ColorWithHex
  const firstColor = colors[0];
  if (firstColor && typeof firstColor === 'object' && firstColor !== null) {
    // Vérifier si l'objet a les propriétés name et hex
    if ('name' in firstColor && 'hex' in firstColor && 
        typeof (firstColor as any).name === 'string' && 
        typeof (firstColor as any).hex === 'string') {
      // C'est déjà un tableau de ColorWithHex, s'assurer que tous ont un hex valide
      return (colors as ColorWithHex[]).map(color => ({
        name: color.name,
        hex: (color.hex && /^#[0-9A-F]{6}$/i.test(color.hex)) 
          ? color.hex.toUpperCase() 
          : getColorHex(color.name)
      }));
    }
  }
  
  // Si c'est un tableau de strings (ancien format), convertir en ColorWithHex[]
  return (colors as string[]).map(colorName => {
    if (typeof colorName === 'string') {
      return {
        name: colorName,
        hex: getColorHex(colorName)
      };
    }
    // Si c'est un objet mais pas au bon format, essayer de récupérer le nom
    if (colorName && typeof colorName === 'object' && 'name' in colorName) {
      const name = (colorName as any).name;
      const hex = (colorName as any).hex;
      return {
        name: typeof name === 'string' ? name : 'Couleur inconnue',
        hex: (hex && /^#[0-9A-F]{6}$/i.test(hex)) ? hex.toUpperCase() : getColorHex(name || 'Couleur inconnue')
      };
    }
    return {
      name: 'Couleur inconnue',
      hex: '#CCCCCC'
    };
  });
}

// Fonction pour obtenir le hex d'une couleur (depuis string ou ColorWithHex)
export function getColorHexValue(color: string | ColorWithHex): string {
  if (typeof color === 'string') {
    return getColorHex(color);
  }
  return color.hex;
}

