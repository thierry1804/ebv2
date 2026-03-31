import { predefinedColors, ColorDefinition } from '../config/colors';

/**
 * Extrait les couleurs dominantes d'une image et les matche
 * aux couleurs prédéfinies de la palette.
 */

interface RGB { r: number; g: number; b: number }

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/** Distance euclidienne dans l'espace RGB */
function colorDistance(a: RGB, b: RGB): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

/** Quantifie un pixel dans un bucket de 32 niveaux par canal pour regrouper les couleurs proches */
function quantize(r: number, g: number, b: number): string {
  const q = (v: number) => Math.round(v / 32) * 32;
  return `${q(r)},${q(g)},${q(b)}`;
}

/**
 * Charge une image depuis une URL et retourne les données pixel via Canvas.
 * Utilise un canvas réduit (max 100px) pour la performance.
 */
async function getImagePixels(src: string): Promise<Uint8ClampedArray | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const MAX = 100;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      resolve(data);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Extrait les N couleurs dominantes (en RGB) d'un tableau de pixels */
function extractDominantRgb(pixels: Uint8ClampedArray, topN: number): RGB[] {
  const buckets = new Map<string, { count: number; rSum: number; gSum: number; bSum: number }>();

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3];
    // Ignorer les pixels transparents
    if (a < 128) continue;
    // Ignorer les pixels quasi-blancs ou quasi-noirs (fond)
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    if (brightness > 240 || brightness < 15) continue;

    const key = quantize(r, g, b);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count++;
      bucket.rSum += r;
      bucket.gSum += g;
      bucket.bSum += b;
    } else {
      buckets.set(key, { count: 1, rSum: r, gSum: g, bSum: b });
    }
  }

  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
    .map((b) => ({
      r: Math.round(b.rSum / b.count),
      g: Math.round(b.gSum / b.count),
      b: Math.round(b.bSum / b.count),
    }));
}

/** Trouve la couleur prédéfinie la plus proche d'un RGB donné */
function matchToPalette(rgb: RGB, maxDistance = 100): ColorDefinition | null {
  let best: ColorDefinition | null = null;
  let bestDist = Infinity;
  for (const color of predefinedColors) {
    const d = colorDistance(rgb, hexToRgb(color.hex));
    if (d < bestDist) {
      bestDist = d;
      best = color;
    }
  }
  return bestDist <= maxDistance ? best : null;
}

/**
 * Détecte les couleurs dominantes d'une liste d'images (URLs)
 * et retourne les couleurs prédéfinies correspondantes (dédupliquées).
 */
export async function detectColorsFromImages(
  imageUrls: string[],
): Promise<ColorDefinition[]> {
  const matched = new Map<string, ColorDefinition>();

  const analyzeOne = async (url: string) => {
    const pixels = await getImagePixels(url);
    if (!pixels) return;
    const dominants = extractDominantRgb(pixels, 5);
    for (const rgb of dominants) {
      const color = matchToPalette(rgb);
      if (color && !matched.has(color.name)) {
        matched.set(color.name, color);
      }
    }
  };

  // Analyser toutes les images en parallèle
  await Promise.all(imageUrls.map(analyzeOne));

  return [...matched.values()];
}
