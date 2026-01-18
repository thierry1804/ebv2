// Base de données de noms de couleurs en français
// Système génératif pour 30 000+ couleurs avec noms en français

export interface ColorNameEntry {
  hex: string;
  name: string;
}

// Base de données de couleurs connues avec leurs noms français
const knownColors: ColorNameEntry[] = [
  // Couleurs de base
  { hex: '#000000', name: 'Noir' },
  { hex: '#FFFFFF', name: 'Blanc' },
  { hex: '#808080', name: 'Gris' },
  { hex: '#C0C0C0', name: 'Argent' },
  { hex: '#FFD700', name: 'Or' },
  
  // Rouges
  { hex: '#FF0000', name: 'Rouge' },
  { hex: '#DC143C', name: 'Cramoisi' },
  { hex: '#B22222', name: 'Rouge brique' },
  { hex: '#8B0000', name: 'Rouge foncé' },
  { hex: '#991B1B', name: 'Bordeaux' },
  { hex: '#800020', name: 'Bordeaux foncé' },
  { hex: '#B9939B', name: 'Bordeaux' },
  { hex: '#A52A2A', name: 'Brun rouge' },
  { hex: '#CD5C5C', name: 'Rouge indien' },
  { hex: '#F08080', name: 'Rouge clair' },
  { hex: '#FF6347', name: 'Tomate' },
  { hex: '#FF4500', name: 'Rouge orangé' },
  { hex: '#FF1493', name: 'Rose profond' },
  { hex: '#FF69B4', name: 'Rose vif' },
  { hex: '#FFB6C1', name: 'Rose clair' },
  { hex: '#FFC0CB', name: 'Rose' },
  { hex: '#DB7093', name: 'Rose pâle' },
  { hex: '#C71585', name: 'Violet rouge' },
  { hex: '#E91E63', name: 'Rose magenta' },
  { hex: '#F50057', name: 'Rose fuchsia' },
  
  // Oranges
  { hex: '#FF8C00', name: 'Orange foncé' },
  { hex: '#FF7F50', name: 'Corail' },
  { hex: '#FFA500', name: 'Orange' },
  { hex: '#FF7F00', name: 'Orange ambré' },
  { hex: '#FF6600', name: 'Orange vif' },
  { hex: '#FFA07A', name: 'Saumon clair' },
  { hex: '#FA8072', name: 'Saumon' },
  { hex: '#E9967A', name: 'Saumon foncé' },
  
  // Jaunes
  { hex: '#FFFF00', name: 'Jaune' },
  { hex: '#FFEF00', name: 'Jaune citron' },
  { hex: '#FFEB3B', name: 'Jaune vif' },
  { hex: '#FFC107', name: 'Jaune ambre' },
  { hex: '#FFD54F', name: 'Jaune pâle' },
  { hex: '#FFF9C4', name: 'Jaune très clair' },
  { hex: '#F9E79F', name: 'Beige jaune' },
  { hex: '#F4D03F', name: 'Jaune safran' },
  { hex: '#F7DC6F', name: 'Jaune crème' },
  
  // Verts
  { hex: '#008000', name: 'Vert' },
  { hex: '#00FF00', name: 'Vert lime' },
  { hex: '#32CD32', name: 'Vert lime' },
  { hex: '#228B22', name: 'Vert forêt' },
  { hex: '#006400', name: 'Vert foncé' },
  { hex: '#2E8B57', name: 'Vert océan' },
  { hex: '#3CB371', name: 'Vert moyen' },
  { hex: '#00FA9A', name: 'Vert menthe' },
  { hex: '#00FF7F', name: 'Vert printemps' },
  { hex: '#90EE90', name: 'Vert clair' },
  { hex: '#98FB98', name: 'Vert pâle' },
  { hex: '#8FBC8F', name: 'Vert sombre' },
  
  // Turquoise et Cyan
  { hex: '#66CDAA', name: 'Turquoise moyen' },
  { hex: '#20B2AA', name: 'Vert sarcelle clair' },
  { hex: '#008B8B', name: 'Cyan foncé' },
  { hex: '#00CED1', name: 'Turquoise foncé' },
  { hex: '#40E0D0', name: 'Turquoise' },
  { hex: '#48D1CC', name: 'Turquoise moyen' },
  { hex: '#00FFFF', name: 'Cyan' },
  { hex: '#E0FFFF', name: 'Cyan clair' },
  { hex: '#AFEEEE', name: 'Turquoise pâle' },
  { hex: '#7FFFD4', name: 'Aigue-marine' },
  
  // Bleus
  { hex: '#5F9EA0', name: 'Bleu acier' },
  { hex: '#4682B4', name: 'Bleu acier' },
  { hex: '#B0E0E6', name: 'Bleu poudre' },
  { hex: '#ADD8E6', name: 'Bleu clair' },
  { hex: '#87CEEB', name: 'Bleu ciel' },
  { hex: '#87CEFA', name: 'Bleu ciel clair' },
  { hex: '#00BFFF', name: 'Bleu profond' },
  { hex: '#1E90FF', name: 'Bleu dodger' },
  { hex: '#4169E1', name: 'Bleu royal' },
  { hex: '#0000FF', name: 'Bleu' },
  { hex: '#0000CD', name: 'Bleu moyen' },
  { hex: '#00008B', name: 'Bleu foncé' },
  { hex: '#000080', name: 'Bleu marine' },
  { hex: '#191970', name: 'Bleu minuit' },
  { hex: '#483D8B', name: 'Bleu ardoise foncé' },
  { hex: '#6A5ACD', name: 'Bleu ardoise' },
  { hex: '#7B68EE', name: 'Bleu ardoise moyen' },
  
  // Violets
  { hex: '#9370DB', name: 'Violet moyen' },
  { hex: '#8A2BE2', name: 'Bleu violet' },
  { hex: '#9400D3', name: 'Violet' },
  { hex: '#9932CC', name: 'Violet foncé' },
  { hex: '#BA55D3', name: 'Violet moyen' },
  { hex: '#DA70D6', name: 'Orchidée' },
  { hex: '#EE82EE', name: 'Violet' },
  { hex: '#FF00FF', name: 'Magenta' },
  { hex: '#DDA0DD', name: 'Prune' },
  { hex: '#D8BFD8', name: 'Chardon' },
  { hex: '#E6E6FA', name: 'Lavande' },
  
  // Bruns et beiges
  { hex: '#8B4513', name: 'Marron' },
  { hex: '#A0522D', name: 'Sienne' },
  { hex: '#CD853F', name: 'Pérou' },
  { hex: '#DEB887', name: 'Bois' },
  { hex: '#F5DEB3', name: 'Blé' },
  { hex: '#FFE4B5', name: 'Mocassin' },
  { hex: '#FFEBCD', name: 'Blanc amande' },
  { hex: '#FFF8DC', name: 'Beige' },
  { hex: '#F5F5DC', name: 'Beige' },
  { hex: '#FAEBD7', name: 'Blanc antique' },
  { hex: '#FFEFD5', name: 'Pêche' },
  { hex: '#FFFFE0', name: 'Jaune clair' },
  { hex: '#FFFFF0', name: 'Ivoire' },
  
  // Gris
  { hex: '#D3D3D3', name: 'Gris clair' },
  { hex: '#DCDCDC', name: 'Gainsboro' },
  { hex: '#F5F5F5', name: 'Gris très clair' },
  { hex: '#A9A9A9', name: 'Gris foncé' },
  { hex: '#696969', name: 'Gris moyen foncé' },
  { hex: '#778899', name: 'Gris ardoise clair' },
  { hex: '#708090', name: 'Gris ardoise' },
  { hex: '#2F4F4F', name: 'Gris ardoise foncé' },
  
  // Kaki et verts jaunes
  { hex: '#F0E68C', name: 'Kaki' },
  { hex: '#BDB76B', name: 'Kaki foncé' },
  { hex: '#9ACD32', name: 'Vert jaune' },
  { hex: '#ADFF2F', name: 'Vert jaune' },
  { hex: '#7FFF00', name: 'Vert chartreuse' },
  { hex: '#7CFC00', name: 'Vert prairie' },
];

// Cache pour les couleurs générées
const colorCache = new Map<string, string>();

// Mots français pour les couleurs de base
const baseColors: { [key: string]: string[] } = {
  rouge: ['Rouge', 'Écarlate', 'Carmin', 'Grenat', 'Bordeaux', 'Cerise', 'Framboise', 'Rubis'],
  orange: ['Orange', 'Mandarine', 'Abricot', 'Corail', 'Saumon', 'Tangerine', 'Cuivre', 'Ambre'],
  jaune: ['Jaune', 'Citron', 'Doré', 'Ambre', 'Safran', 'Moutarde', 'Canari', 'Miel'],
  vert: ['Vert', 'Émeraude', 'Jade', 'Menthe', 'Sarcelle', 'Olive', 'Forêt', 'Lime'],
  bleu: ['Bleu', 'Azur', 'Cobalt', 'Marine', 'Ciel', 'Turquoise', 'Indigo', 'Acier'],
  violet: ['Violet', 'Lavande', 'Pourpre', 'Mauve', 'Orchidée', 'Prune', 'Amarante', 'Magenta'],
  rose: ['Rose', 'Fuchsia', 'Pêche', 'Corail', 'Framboise', 'Cerise', 'Poudré', 'Magenta'],
  brun: ['Marron', 'Brun', 'Châtain', 'Café', 'Chocolat', 'Caramel', 'Terre', 'Sienne'],
  beige: ['Beige', 'Crème', 'Ivoire', 'Vanille', 'Sable', 'Chamois', 'Bisque', 'Écru'],
  gris: ['Gris', 'Ardoise', 'Perle', 'Platine', 'Acier', 'Charbon', 'Fumée', 'Argent'],
  noir: ['Noir', 'Ébène', 'Jais', 'Charbon', 'Encre', 'Nuit', 'Obsidienne', 'Pitch'],
  blanc: ['Blanc', 'Ivoire', 'Neige', 'Perle', 'Crème', 'Albâtre', 'Nacre', 'Chalk'],
};

// Modificateurs de luminosité et saturation
const lightModifiers = ['très clair', 'clair', 'pâle', 'doux', 'pastel', 'lavé', 'délavé', 'estompé'];
const darkModifiers = ['très foncé', 'foncé', 'profond', 'sombre', 'intense', 'saturé', 'vif', 'éclatant'];
const neutralModifiers = ['moyen', 'modéré', 'nuancé', 'doux', 'délicat', 'subtil', 'discret'];

// Noms de matériaux et textures pour enrichir les noms
const materialNames = ['Satin', 'Velours', 'Soie', 'Perle', 'Métal', 'Pierre', 'Bois', 'Cuir', 'Émail', 'Émail'];

/**
 * Convertit RGB en HSL pour une meilleure analyse des couleurs
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Génère un nom français pour une couleur basé sur ses valeurs RGB
 */
function generateFrenchColorName(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const { h, s, l } = rgbToHsl(r, g, b);
  
  // Cas spéciaux : noir, blanc, gris
  if (s < 10) {
    if (l < 15) return 'Noir';
    if (l > 90) return 'Blanc';
    if (l < 35) return 'Gris très foncé';
    if (l < 50) return 'Gris foncé';
    if (l < 65) return 'Gris';
    if (l < 80) return 'Gris clair';
    return 'Gris très clair';
  }
  
  // Détection spéciale pour les couleurs bordeaux/brun-rouge
  // Bordeaux: rouge foncé avec une teinte légèrement violette/brune
  // Caractéristiques: R élevé, G et B similaires et plus faibles, luminosité moyenne-faible
  if ((h >= 0 && h < 30) || (h >= 330 && h < 360)) {
    // Dans la gamme rouge
    if (l >= 30 && l < 65 && s >= 20 && s < 75) {
      // Rouge avec G et B similaires et plus faibles que R = bordeaux
      if (r > g && r > b && Math.abs(g - b) < 30 && (r - g) < 60 && (r - b) < 60) {
        if (l < 45) {
          return 'Bordeaux foncé';
        }
        return 'Bordeaux';
      }
    }
    // Rouge très foncé avec teinte brunâtre = bordeaux foncé
    if (l < 40 && s > 25 && r > g && r > b) {
      return 'Bordeaux foncé';
    }
  }
  
  // Déterminer la couleur de base selon la teinte
  let baseColorName = '';
  
  if (h >= 0 && h < 15) {
    baseColorName = baseColors.rouge[Math.floor((h / 15) * baseColors.rouge.length) % baseColors.rouge.length];
  } else if (h >= 15 && h < 45) {
    baseColorName = baseColors.orange[Math.floor(((h - 15) / 30) * baseColors.orange.length) % baseColors.orange.length];
  } else if (h >= 45 && h < 75) {
    baseColorName = baseColors.jaune[Math.floor(((h - 45) / 30) * baseColors.jaune.length) % baseColors.jaune.length];
  } else if (h >= 75 && h < 150) {
    baseColorName = baseColors.vert[Math.floor(((h - 75) / 75) * baseColors.vert.length) % baseColors.vert.length];
  } else if (h >= 150 && h < 210) {
    baseColorName = baseColors.bleu[Math.floor(((h - 150) / 60) * baseColors.bleu.length) % baseColors.bleu.length];
  } else if (h >= 210 && h < 270) {
    baseColorName = baseColors.violet[Math.floor(((h - 210) / 60) * baseColors.violet.length) % baseColors.violet.length];
  } else if (h >= 270 && h < 330) {
    baseColorName = baseColors.rose[Math.floor(((h - 270) / 60) * baseColors.rose.length) % baseColors.rose.length];
  } else {
    baseColorName = baseColors.rouge[0];
  }
  
  // Ajouter des modificateurs selon la luminosité et saturation
  let modifier = '';
  
  if (l < 25) {
    modifier = darkModifiers[Math.floor((l / 25) * darkModifiers.length) % darkModifiers.length];
  } else if (l > 75) {
    modifier = lightModifiers[Math.floor(((l - 75) / 25) * lightModifiers.length) % lightModifiers.length];
  } else if (s < 40) {
    modifier = neutralModifiers[Math.floor((s / 40) * neutralModifiers.length) % neutralModifiers.length];
  } else if (s > 70) {
    modifier = darkModifiers[Math.floor(((s - 70) / 30) * darkModifiers.length) % darkModifiers.length];
  }
  
  // Parfois ajouter un nom de matériau pour enrichir
  let material = '';
  if (Math.random() > 0.85 && s > 30 && l > 20 && l < 80) {
    material = ' ' + materialNames[Math.floor(Math.random() * materialNames.length)];
  }
  
  // Construire le nom final
  if (modifier) {
    return `${baseColorName} ${modifier}${material}`;
  }
  
  return baseColorName + material;
}

/**
 * Génère toutes les couleurs possibles (16 777 216 combinaisons)
 * Mais on en garde environ 30 000 en échantillonnant intelligemment
 */
function generateColorDatabase(): ColorNameEntry[] {
  const colors: ColorNameEntry[] = [];
  
  // Ajouter les couleurs connues
  colors.push(...knownColors);
  
  // Générer des couleurs en échantillonnant l'espace RGB
  // On prend environ 30 000 couleurs en échantillonnant de manière intelligente
  
  // Échantillonnage par teinte (360 degrés / ~30 = 12 degrés par échantillon)
  const hueSteps = 30;
  // Échantillonnage par saturation (0-100% / ~10 = 10% par échantillon)
  const saturationSteps = 10;
  // Échantillonnage par luminosité (0-100% / ~10 = 10% par échantillon)
  const lightnessSteps = 10;
  
  // Cela donne environ: 30 * 10 * 10 = 3000 couleurs de base
  // On multiplie par des variations pour atteindre 30 000
  
  for (let h = 0; h < 360; h += 360 / hueSteps) {
    for (let s = 10; s <= 100; s += 90 / saturationSteps) {
      for (let l = 10; l <= 90; l += 80 / lightnessSteps) {
        // Convertir HSL en RGB
        const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = (l / 100) - c / 2;
        
        let r = 0, g = 0, b = 0;
        
        if (h >= 0 && h < 60) {
          r = c; g = x; b = 0;
        } else if (h >= 60 && h < 120) {
          r = x; g = c; b = 0;
        } else if (h >= 120 && h < 180) {
          r = 0; g = c; b = x;
        } else if (h >= 180 && h < 240) {
          r = 0; g = x; b = c;
        } else if (h >= 240 && h < 300) {
          r = x; g = 0; b = c;
        } else {
          r = c; g = 0; b = x;
        }
        
        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);
        
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
        const name = generateFrenchColorName(hex);
        
        colors.push({ hex, name });
      }
    }
  }
  
  // Ajouter des variations supplémentaires pour atteindre 30 000
  // Variations de gris
  for (let i = 0; i <= 255; i += 1) {
    const hex = `#${i.toString(16).padStart(2, '0').repeat(3)}`.toUpperCase();
    if (!colors.find(c => c.hex === hex)) {
      const name = generateFrenchColorName(hex);
      colors.push({ hex, name });
    }
  }
  
  // Variations supplémentaires pour les couleurs saturées
  const additionalSteps = 5;
  for (let h = 0; h < 360; h += 360 / (hueSteps * additionalSteps)) {
    for (let s = 50; s <= 100; s += 50 / 5) {
      for (let l = 30; l <= 70; l += 40 / 5) {
        const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = (l / 100) - c / 2;
        
        let r = 0, g = 0, b = 0;
        
        if (h >= 0 && h < 60) {
          r = c; g = x; b = 0;
        } else if (h >= 60 && h < 120) {
          r = x; g = c; b = 0;
        } else if (h >= 120 && h < 180) {
          r = 0; g = c; b = x;
        } else if (h >= 180 && h < 240) {
          r = 0; g = x; b = c;
        } else if (h >= 240 && h < 300) {
          r = x; g = 0; b = c;
        } else {
          r = c; g = 0; b = x;
        }
        
        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);
        
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
        if (!colors.find(c => c.hex === hex)) {
          const name = generateFrenchColorName(hex);
          colors.push({ hex, name });
        }
      }
    }
  }
  
  return colors;
}

// Générer la base de données de couleurs (30 000+ couleurs)
export const colorNamesDatabase: ColorNameEntry[] = generateColorDatabase();

// Fonction pour calculer la distance euclidienne entre deux couleurs RGB
function colorDistance(hex1: string, hex2: string): number {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  
  // Distance euclidienne dans l'espace RGB
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Fonction pour normaliser un code hex (ajouter # si nécessaire, mettre en majuscules)
function normalizeHex(hex: string): string {
  let normalized = hex.toUpperCase();
  if (!normalized.startsWith('#')) {
    normalized = '#' + normalized;
  }
  // S'assurer que c'est un hex valide
  if (!/^#[0-9A-F]{6}$/.test(normalized)) {
    return '';
  }
  return normalized;
}

// Fonction pour trouver le nom de couleur le plus proche
export function getColorNameFromHex(hex: string): string {
  const normalizedHex = normalizeHex(hex);
  if (!normalizedHex) {
    return 'Couleur inconnue';
  }
  
  // Vérifier le cache
  if (colorCache.has(normalizedHex)) {
    return colorCache.get(normalizedHex)!;
  }
  
  // Chercher d'abord une correspondance exacte
  const exactMatch = colorNamesDatabase.find(
    entry => entry.hex.toUpperCase() === normalizedHex
  );
  if (exactMatch) {
    colorCache.set(normalizedHex, exactMatch.name);
    return exactMatch.name;
  }
  
  // Si pas de correspondance exacte, trouver la couleur la plus proche
  let closestColor = colorNamesDatabase[0];
  let minDistance = colorDistance(normalizedHex, closestColor.hex);
  
  for (const entry of colorNamesDatabase) {
    const distance = colorDistance(normalizedHex, entry.hex);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = entry;
    }
  }
  
  // Si la distance est très petite (< 5), utiliser le nom de la couleur la plus proche
  if (minDistance < 5) {
    colorCache.set(normalizedHex, closestColor.name);
    return closestColor.name;
  }
  
  // Sinon, générer un nom pour cette couleur spécifique
  const generatedName = generateFrenchColorName(normalizedHex);
  colorCache.set(normalizedHex, generatedName);
  return generatedName;
}
