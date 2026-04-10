import type { Product } from '../types';

function firstUsableImageUrl(product: Product): string | undefined {
  if (!Array.isArray(product.images) || product.images.length === 0) return undefined;
  const url = product.images.find((u) => typeof u === 'string' && u.trim().length > 0);
  return url?.trim();
}

/**
 * Pour chaque nom de catégorie, la première image du premier produit rencontré
 * dans `products` (ordre du tableau, typiquement du plus récent au plus ancien).
 */
export function buildFirstProductImageByCategoryName(products: Product[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of products) {
    if (map.has(p.category)) continue;
    const url = firstUsableImageUrl(p);
    if (url) map.set(p.category, url);
  }
  return map;
}
