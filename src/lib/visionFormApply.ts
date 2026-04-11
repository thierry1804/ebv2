import { predefinedColors } from '../config/colors';
import { getHexFromColorName } from '../config/colorNames';

export type SelectedColorEntry = { name: string; hex: string; custom: boolean };

function firstNonEmptyString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === 'string') {
      const t = v.trim();
      if (t.length > 0) return t;
    }
  }
  return null;
}

function pickSizes(parsed: Record<string, unknown>): string | null {
  const t = parsed.tailles ?? parsed.sizes ?? parsed.size;
  if (typeof t === 'string') {
    const s = t.trim();
    return s.length > 0 ? s : null;
  }
  if (Array.isArray(t)) {
    const parts = t
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }
  return null;
}

function pickCouleurNames(parsed: Record<string, unknown>): string[] {
  const v = parsed.couleurs ?? parsed.colors ?? parsed.couleur;
  if (Array.isArray(v)) {
    return v
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof v === 'string' && v.trim()) {
    return v
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/** Associe les libellés IA aux couleurs prédéfinies ou entrées personnalisées. */
export function visionColorNamesToSelectedEntries(names: string[]): SelectedColorEntry[] {
  const out: SelectedColorEntry[] = [];
  const seen = new Set<string>();

  for (const raw of names) {
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const pre = predefinedColors.find((c) => c.name.toLowerCase() === key);
    if (pre) {
      out.push({ name: pre.name, hex: pre.hex, custom: false });
      continue;
    }

    const hex = getHexFromColorName(raw);
    if (hex) {
      out.push({
        name: raw,
        hex: /^#/i.test(hex) ? hex : `#${hex}`,
        custom: true,
      });
    } else {
      out.push({ name: raw, hex: '#CCCCCC', custom: true });
    }
  }
  return out;
}

/** Champs texte à appliquer au formulaire produit admin (null = ne pas modifier). */
export interface VisionFormAutoFill {
  name: string | null;
  description: string | null;
  composition: string | null;
  brand: string | null;
  sizes: string | null;
  selectedColors: SelectedColorEntry[];
}

export function buildVisionFormAutoFill(parsed: Record<string, unknown>): VisionFormAutoFill {
  return {
    name: firstNonEmptyString(parsed.nom, parsed.name, parsed.title),
    description: firstNonEmptyString(parsed.description),
    composition: firstNonEmptyString(parsed.composition, parsed.ingredients),
    brand: firstNonEmptyString(parsed.marque, parsed.brand),
    sizes: pickSizes(parsed),
    selectedColors: visionColorNamesToSelectedEntries(pickCouleurNames(parsed)),
  };
}
