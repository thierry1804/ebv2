import type { Category } from '../types';

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/** Libellé normalisé pour comparaison (casse, accents, ponctuation). */
export function normalizeCategoryLabel(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function compactAlnum(s: string): string {
  return normalizeCategoryLabel(s).replace(/\s/g, '');
}

export type VisionCategoryMatch =
  | { type: 'existing'; name: string }
  | { type: 'create'; suggestedName: string };

/**
 * Rapproche la catégorie renvoyée par l’IA des catégories existantes.
 * Ne renvoie `create` que si aucune correspondance raisonnable n’est trouvée.
 */
export function matchVisionCategoryToExisting(
  hint: string,
  categories: Pick<Category, 'name'>[],
): VisionCategoryMatch {
  const raw = hint.trim();
  if (!raw) {
    return { type: 'create', suggestedName: '' };
  }
  if (categories.length === 0) {
    return { type: 'create', suggestedName: raw };
  }

  const h = normalizeCategoryLabel(raw);
  const hc = compactAlnum(raw);

  for (const c of categories) {
    if (normalizeCategoryLabel(c.name) === h) {
      return { type: 'existing', name: c.name };
    }
  }

  for (const c of categories) {
    const cn = normalizeCategoryLabel(c.name);
    if (cn.length < 2) continue;
    if (h === cn || (h.startsWith(`${cn} `) && h.length > cn.length)) {
      return { type: 'existing', name: c.name };
    }
  }

  let best: { name: string; dist: number } | null = null;
  for (const c of categories) {
    const cc = compactAlnum(c.name);
    if (cc.length === 0) continue;
    const d = levenshtein(hc, cc);
    if (!best || d < best.dist) {
      best = { name: c.name, dist: d };
    }
  }

  if (best) {
    const maxLen = Math.max(hc.length, compactAlnum(best.name).length, 1);
    const ratio = best.dist / maxLen;
    if (best.dist === 0 || best.dist <= 2 || ratio <= 0.34) {
      return { type: 'existing', name: best.name };
    }
  }

  return { type: 'create', suggestedName: raw };
}
