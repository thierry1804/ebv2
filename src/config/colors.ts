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

