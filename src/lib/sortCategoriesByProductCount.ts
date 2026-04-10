import type { Category, Product } from '../types';

/** Nombre de produits par nom de catégorie (`product.category`). */
export function buildProductCountByCategoryMap(products: Product[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of products) {
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  }
  return counts;
}

/**
 * Trie les catégories par nombre de produits décroissant.
 * Exclut les catégories sans aucun produit (nom identique à `product.category`).
 * En cas d'égalité, conserve l'ordre d'origine (ex. display_order côté API).
 */
export function sortCategoriesByProductCount(
  categories: Category[],
  products: Product[]
): Category[] {
  if (categories.length === 0) return [];

  const counts = buildProductCountByCategoryMap(products);
  const withProducts = categories.filter((c) => (counts.get(c.name) ?? 0) > 0);
  if (withProducts.length === 0) return [];

  const originalIndex = new Map(withProducts.map((c, i) => [c.id, i]));

  return [...withProducts].sort((a, b) => {
    const diff = (counts.get(b.name) ?? 0) - (counts.get(a.name) ?? 0);
    if (diff !== 0) return diff;
    return (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0);
  });
}
