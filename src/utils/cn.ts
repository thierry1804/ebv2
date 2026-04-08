import { twMerge } from 'tailwind-merge';

/** Fusionne les classes Tailwind (dernière utilitaire gagnante : ex. text-gray-800 vs text-white). */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return twMerge(classes.filter(Boolean) as string[]);
}

