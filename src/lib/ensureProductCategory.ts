import { supabase, isSupabaseConfigured } from './supabase';
import { slugifyForCategory } from '../utils/slugify';
import type { Category } from '../types';

const PG_UNIQUE_VIOLATION = '23505';

/**
 * Garantit qu’une catégorie avec ce nom existe en base (comparaison insensible à la casse).
 * @returns nom canonique pour le champ produit (tel qu’en base) et si une ligne a été créée.
 */
export async function ensureProductCategory(
  proposedName: string,
  existingCategories: Pick<Category, 'name'>[],
  reloadCategories: () => Promise<void>,
): Promise<{ canonicalName: string; created: boolean }> {
  const name = proposedName.trim();
  if (!name) {
    return { canonicalName: '', created: false };
  }

  const found = existingCategories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (found) {
    return { canonicalName: found.name, created: false };
  }

  if (!isSupabaseConfigured) {
    throw new Error('Supabase non configuré : impossible de créer la catégorie.');
  }

  let slug = slugifyForCategory(name);
  const insertRow = async (s: string) =>
    supabase.from('categories').insert({
      name,
      slug: s,
      is_active: true,
      display_order: 100,
    });

  let { error } = await insertRow(slug);
  if (error?.code === PG_UNIQUE_VIOLATION) {
    slug = `${slugifyForCategory(name)}-${crypto.randomUUID().slice(0, 8)}`;
    ({ error } = await insertRow(slug));
  }

  if (error) {
    throw new Error(error.message || 'Insertion catégorie refusée');
  }

  await reloadCategories();
  return { canonicalName: name, created: true };
}
