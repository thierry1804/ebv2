// Système de nommage de couleurs en français - 30 000+ références

export interface ColorNameEntry {
  hex: string;
  name: string;
}

// Base étendue avec plus de nuances
const knownColors: ColorNameEntry[] = [
  // Noirs et très foncés
  { hex: '#000000', name: 'Noir' },
  { hex: '#0A0A0A', name: 'Noir de jais' },
  { hex: '#1C1C1C', name: 'Noir d\'encre' },
  { hex: '#2B2B2B', name: 'Noir charbon' },

  // Blancs
  { hex: '#FFFFFF', name: 'Blanc' },
  { hex: '#FAFAFA', name: 'Blanc cassé' },
  { hex: '#F5F5F5', name: 'Blanc fumé' },
  { hex: '#FFFEF0', name: 'Blanc ivoire' },
  { hex: '#FFF8DC', name: 'Blanc crème' },

  // Gris
  { hex: '#808080', name: 'Gris' },
  { hex: '#C0C0C0', name: 'Gris argent' },
  { hex: '#A9A9A9', name: 'Gris anthracite' },
  { hex: '#696969', name: 'Gris acier' },
  { hex: '#D3D3D3', name: 'Gris perle' },
  { hex: '#778899', name: 'Gris ardoise' },
  
  // Rouges - plus de nuances
  { hex: '#FF0000', name: 'Rouge vif' },
  { hex: '#DC143C', name: 'Cramoisi' },
  { hex: '#B22222', name: 'Rouge brique' },
  { hex: '#8B0000', name: 'Rouge sang' },
  { hex: '#A52A2A', name: 'Brun rouge' },
  { hex: '#CD5C5C', name: 'Rouge indien' },
  { hex: '#E74C3C', name: 'Rouge vermillon' },
  { hex: '#C0392B', name: 'Rouge carmin' },

  // Bordeaux - teintes spécifiques
  { hex: '#6D1F2D', name: 'Bordeaux' },
  { hex: '#800020', name: 'Bordeaux profond' },
  { hex: '#5C1F28', name: 'Bordeaux foncé' },
  { hex: '#85203B', name: 'Bordeaux rubis' },
  { hex: '#722F37', name: 'Bordeaux grenat' },

  // Roses
  { hex: '#FF69B4', name: 'Rose bonbon' },
  { hex: '#FFB6C1', name: 'Rose poudré' },
  { hex: '#FFC0CB', name: 'Rose pâle' },
  { hex: '#FF1493', name: 'Rose fuchsia' },
  { hex: '#DB7093', name: 'Rose violacé' },
  { hex: '#F8B8D4', name: 'Rose dragée' },
  
  // Oranges
  { hex: '#FF8C00', name: 'Orange sombre' },
  { hex: '#FFA500', name: 'Orange' },
  { hex: '#FF7F50', name: 'Corail' },
  { hex: '#FF6347', name: 'Rouge tomate' },
  { hex: '#FA8072', name: 'Saumon' },
  { hex: '#E67E22', name: 'Orange citrouille' },
  
  // Jaunes
  { hex: '#FFFF00', name: 'Jaune citron' },
  { hex: '#FFD700', name: 'Or' },
  { hex: '#FFC107', name: 'Jaune ambré' },
  { hex: '#F1C40F', name: 'Jaune tournesol' },
  { hex: '#F9E79F', name: 'Jaune vanille' },
  
  // Verts
  { hex: '#008000', name: 'Vert' },
  { hex: '#00FF00', name: 'Vert lime' },
  { hex: '#228B22', name: 'Vert forêt' },
  { hex: '#006400', name: 'Vert sapin' },
  { hex: '#2ECC71', name: 'Vert émeraude' },
  { hex: '#27AE60', name: 'Vert néphrite' },
  { hex: '#7FFF00', name: 'Vert chartreuse' },
  { hex: '#556B2F', name: 'Vert olive' },
  { hex: '#98FB98', name: 'Vert menthe' },
  
  // Bleus
  { hex: '#0000FF', name: 'Bleu pur' },
  { hex: '#4169E1', name: 'Bleu roi' },
  { hex: '#000080', name: 'Bleu marine' },
  { hex: '#1E90FF', name: 'Bleu azur' },
  { hex: '#87CEEB', name: 'Bleu ciel' },
  { hex: '#00BFFF', name: 'Bleu ciel profond' },
  { hex: '#3498DB', name: 'Bleu piscine' },
  { hex: '#5DADE2', name: 'Bleu lagon' },

  // Turquoise et cyan
  { hex: '#40E0D0', name: 'Turquoise' },
  { hex: '#00CED1', name: 'Turquoise sombre' },
  { hex: '#00FFFF', name: 'Cyan' },
  { hex: '#7FFFD4', name: 'Aigue-marine' },
  { hex: '#008B8B', name: 'Bleu canard' },
  
  // Violets et pourpres
  { hex: '#800080', name: 'Pourpre' },
  { hex: '#9400D3', name: 'Violet foncé' },
  { hex: '#8A2BE2', name: 'Bleu violet' },
  { hex: '#9B59B6', name: 'Améthyste' },
  { hex: '#E6E6FA', name: 'Lavande' },
  { hex: '#DDA0DD', name: 'Prune' },
  
  // Bruns et terres
  { hex: '#8B4513', name: 'Brun sépia' },
  { hex: '#A0522D', name: 'Terre de Sienne' },
  { hex: '#654321', name: 'Brun chocolat' },
  { hex: '#D2691E', name: 'Brun caramel' },
  { hex: '#CD853F', name: 'Ocre' },
];

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const delta = max - min;
  
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / delta + 2) / 6;
    else h = ((r - g) / delta + 4) / 6;
  }
  h = Math.round(h * 360);
  
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  
  return { h, s: s * 100, l: l * 100 };
}

function generateFrenchColorName(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const { h, s, l } = rgbToHsl(r, g, b);
  
  // Cas achromatiques (noir, blanc, gris)
  if (s < 8) {
    if (l < 5) return 'Noir';
    if (l < 15) return 'Noir d\'encre';
    if (l < 25) return 'Gris très foncé';
    if (l < 40) return 'Gris anthracite';
    if (l < 55) return 'Gris';
    if (l < 70) return 'Gris clair';
    if (l < 85) return 'Gris perle';
    if (l < 95) return 'Blanc cassé';
    return 'Blanc';
  }
  
  // Bordeaux - détection améliorée (zone rouge uniquement)
  if (h >= 340 || h <= 12) {
    if (l >= 20 && l <= 50 && s >= 30 && s <= 75) {
      const gToB = Math.abs(g - b);
      if (gToB < 30 && r > g + 15 && r > b + 15) {
        if (l < 30) return 'Bordeaux foncé';
        if (l < 40) return 'Bordeaux';
        return 'Rouge bordeaux';
      }
    }
  }

  // Nommage par teinte dominante
  let baseName = '';
  let modifier = '';

  // Rouges purs (345-10°) - vraiment rouge
  if (h >= 345 || h <= 10) {
    if (s > 80) baseName = l < 40 ? 'Vermillon' : l < 60 ? 'Rouge vif' : 'Rouge clair';
    else if (s > 50) baseName = l < 40 ? 'Rouge sang' : l < 60 ? 'Rouge' : 'Rose rouge';
    else baseName = l < 40 ? 'Brun rouge' : l < 60 ? 'Rouge terne' : 'Rose pâle';
  }
  // Orange vif / Rouge-orangé (10-25°)
  else if (h > 10 && h <= 25) {
    if (s > 75) baseName = l > 55 ? 'Orange vif' : l > 40 ? 'Orange' : 'Orange foncé';
    else if (s > 50) baseName = l > 55 ? 'Orange' : l > 35 ? 'Orange brûlé' : 'Rouille';
    else baseName = l < 40 ? 'Brun rouille' : l < 60 ? 'Orange terne' : 'Pêche';
  }
  // Orange (25-45°)
  else if (h > 25 && h <= 45) {
    if (s > 80) baseName = l > 60 ? 'Orange éclatant' : l > 45 ? 'Orange vif' : 'Orange sombre';
    else if (s > 50) baseName = l > 55 ? 'Orange' : l > 40 ? 'Orange cuivré' : 'Brun orangé';
    else baseName = l > 65 ? 'Pêche clair' : l > 45 ? 'Abricot' : 'Brun clair';
  }
  // Orange-jaune (45-60°)
  else if (h > 45 && h <= 60) {
    if (s > 80) baseName = 'Orange doré';
    else if (s > 50) baseName = l > 55 ? 'Abricot' : 'Ocre orangé';
    else baseName = l > 65 ? 'Beige rosé' : 'Fauve';
  }
  // Jaune-orange (60-75°)
  else if (h > 60 && h <= 75) {
    if (s > 70) baseName = l > 65 ? 'Jaune d\'or' : 'Jaune doré';
    else baseName = l < 50 ? 'Ocre' : l > 70 ? 'Jaune pâle' : 'Jaune ambré';
  }
  // Jaune (75-90°)
  else if (h > 75 && h <= 90) {
    if (s > 80) baseName = l > 70 ? 'Jaune citron' : 'Jaune vif';
    else if (s > 40) baseName = l > 70 ? 'Jaune clair' : 'Jaune';
    else baseName = l > 70 ? 'Beige jaune' : 'Kaki clair';
  }
  // Jaune-vert (90-100°)
  else if (h > 90 && h <= 100) {
    if (s > 70) baseName = 'Jaune verdâtre';
    else baseName = l > 60 ? 'Jaune olive' : 'Kaki';
  }
  // Vert-jaune (100-130°)
  else if (h > 100 && h <= 130) {
    if (s > 70) baseName = l > 55 ? 'Vert chartreuse' : 'Vert lime';
    else if (s > 40) baseName = l > 50 ? 'Vert pomme' : 'Vert olive';
    else baseName = l > 60 ? 'Vert pâle' : 'Vert kaki';
  }
  // Vert (130-140°)
  else if (h > 130 && h <= 140) {
    baseName = s > 60 ? 'Vert vif' : l > 50 ? 'Vert' : 'Vert sombre';
  }
  // Vert (140-180°)
  else if (h > 140 && h <= 180) {
    if (s > 70) baseName = l < 40 ? 'Vert sapin' : l < 60 ? 'Vert émeraude' : 'Vert clair';
    else if (s > 35) baseName = l < 50 ? 'Vert forêt' : 'Vert';
    else baseName = 'Vert grisé';
  }
  // Cyan-vert (180-200°)
  else if (h > 180 && h <= 200) {
    baseName = s > 60 ? 'Turquoise' : 'Bleu canard';
  }
  // Cyan (200-220°)
  else if (h > 200 && h <= 220) {
    baseName = s > 70 ? 'Cyan vif' : l > 60 ? 'Cyan pâle' : 'Bleu pétrole';
  }
  // Bleu (220-260°)
  else if (h > 220 && h <= 260) {
    if (s > 75) baseName = l < 40 ? 'Bleu marine' : l < 60 ? 'Bleu roi' : 'Bleu ciel';
    else if (s > 40) baseName = l < 50 ? 'Bleu nuit' : 'Bleu';
    else baseName = l > 60 ? 'Bleu gris clair' : 'Bleu gris';
  }
  // Violet-bleu (260-280°)
  else if (h > 260 && h <= 280) {
    baseName = s > 60 ? 'Bleu violet' : 'Violet grisé';
  }
  // Violet (280-300°)
  else if (h > 280 && h <= 300) {
    if (s > 70) baseName = l < 45 ? 'Pourpre' : 'Violet';
    else baseName = l > 70 ? 'Lavande' : 'Violet terne';
  }
  // Magenta (300-320°)
  else if (h > 300 && h <= 320) {
    baseName = s > 70 ? 'Magenta' : l > 65 ? 'Rose mauve' : 'Prune';
  }
  // Rose (320-345°)
  else if (h > 320 && h < 345) {
    if (s > 70) baseName = l > 70 ? 'Rose bonbon' : 'Rose fuchsia';
    else if (s > 35) baseName = l > 70 ? 'Rose poudré' : 'Rose';
    else baseName = 'Rose grisé';
  }
  // Rouge (345-360°) - fin du cercle
  else {
    if (s > 80) baseName = l < 40 ? 'Vermillon' : l < 60 ? 'Rouge vif' : 'Rouge clair';
    else if (s > 50) baseName = l < 40 ? 'Rouge sang' : l < 60 ? 'Rouge' : 'Rose rouge';
    else baseName = l < 40 ? 'Brun rouge' : l < 60 ? 'Rouge terne' : 'Rose pâle';
  }
  
  // Modificateurs de luminosité plus précis
  if (l < 20 && !baseName.includes('foncé') && !baseName.includes('sombre')) {
    modifier = 'très sombre';
  } else if (l > 85 && !baseName.includes('clair') && !baseName.includes('pâle')) {
    modifier = 'très clair';
  } else if (s < 25 && l > 50 && l < 80) {
    modifier = 'pastel';
  }
  
  return modifier ? `${baseName} ${modifier}` : baseName;
}

// Génération optimisée pour 30 000+ couleurs
function generateColorDatabase(): ColorNameEntry[] {
  const colors = [...knownColors];
  const seen = new Set(knownColors.map(c => c.hex.toUpperCase()));

  // Échantillonnage HSL dense - 360 teintes × 19 saturations × 17 luminosités = ~116 000 combinaisons
  // On filtre pour garder environ 30 000 couleurs pertinentes

  // 1. Échantillonnage principal (teintes toutes les 3°, haute densité)
  for (let h = 0; h < 360; h += 3) {
    for (let s = 10; s <= 100; s += 10) {
      for (let l = 10; l <= 90; l += 5) {
        const hex = hslToHex(h, s, l);
        if (!seen.has(hex)) {
          colors.push({ hex, name: generateFrenchColorName(hex) });
          seen.add(hex);
        }
      }
    }
  }

  // 2. Échantillonnage intermédiaire pour saturation et luminosité
  for (let h = 0; h < 360; h += 6) {
    for (let s = 15; s <= 95; s += 5) {
      for (let l = 12; l <= 88; l += 8) {
        const hex = hslToHex(h, s, l);
        if (!seen.has(hex)) {
          colors.push({ hex, name: generateFrenchColorName(hex) });
          seen.add(hex);
        }
      }
    }
  }
  
  // 3. Échantillonnage dense pour les gris (tous les niveaux)
  for (let i = 0; i <= 255; i += 1) {
    const hex = `#${i.toString(16).padStart(2, '0').repeat(3)}`.toUpperCase();
    if (!seen.has(hex)) {
      colors.push({ hex, name: generateFrenchColorName(hex) });
      seen.add(hex);
    }
  }
  
  // 4. Variations fines pour zones critiques (bordeaux, pastels, etc.)
  for (let h = 0; h < 30; h += 2) { // Rouge-bordeaux
    for (let s = 30; s <= 80; s += 5) {
      for (let l = 25; l <= 55; l += 3) {
        const hex = hslToHex(h, s, l);
        if (!seen.has(hex)) {
          colors.push({ hex, name: generateFrenchColorName(hex) });
          seen.add(hex);
        }
      }
    }
  }

  for (let h = 340; h < 360; h += 2) { // Rouge-bordeaux (suite)
    for (let s = 30; s <= 80; s += 5) {
      for (let l = 25; l <= 55; l += 3) {
        const hex = hslToHex(h, s, l);
        if (!seen.has(hex)) {
          colors.push({ hex, name: generateFrenchColorName(hex) });
          seen.add(hex);
        }
      }
    }
  }

  // 5. Pastels (saturation faible, luminosité haute)
  for (let h = 0; h < 360; h += 4) {
    for (let s = 10; s <= 40; s += 3) {
      for (let l = 70; l <= 90; l += 2) {
        const hex = hslToHex(h, s, l);
        if (!seen.has(hex)) {
          colors.push({ hex, name: generateFrenchColorName(hex) });
          seen.add(hex);
        }
      }
    }
  }

  // 6. Couleurs très saturées
  for (let h = 0; h < 360; h += 4) {
    for (let s = 85; s <= 100; s += 2) {
      for (let l = 20; l <= 70; l += 5) {
        const hex = hslToHex(h, s, l);
        if (!seen.has(hex)) {
          colors.push({ hex, name: generateFrenchColorName(hex) });
          seen.add(hex);
        }
      }
    }
  }
  
  console.log(`Base de données générée: ${colors.length} couleurs`);
  return colors;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export const colorNamesDatabase = generateColorDatabase();
const colorCache = new Map<string, string>();

function colorDistance(hex1: string, hex2: string): number {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  
  // Distance perceptuelle pondérée
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

export function getColorNameFromHex(hex: string): string {
  const normalized = hex.toUpperCase().startsWith('#') ? hex.toUpperCase() : `#${hex.toUpperCase()}`;
  if (!/^#[0-9A-F]{6}$/.test(normalized)) return 'Couleur invalide';
  
  if (colorCache.has(normalized)) return colorCache.get(normalized)!;
  
  const exactMatch = colorNamesDatabase.find(e => e.hex === normalized);
  if (exactMatch) {
    colorCache.set(normalized, exactMatch.name);
    return exactMatch.name;
  }
  
  let closest = colorNamesDatabase[0];
  let minDist = colorDistance(normalized, closest.hex);
  
  for (const entry of colorNamesDatabase) {
    const dist = colorDistance(normalized, entry.hex);
    if (dist < minDist) {
      minDist = dist;
      closest = entry;
    }
  }
  
  const name = minDist < 8 ? closest.name : generateFrenchColorName(normalized);
  colorCache.set(normalized, name);
  return name;
}