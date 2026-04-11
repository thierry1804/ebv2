/** Slug URL à partir d’un libellé (ex. nom de catégorie), sans accents. */
export function slugifyForCategory(input: string): string {
  const base = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  const slug = base
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
  return slug.length > 0 ? slug : 'categorie';
}
