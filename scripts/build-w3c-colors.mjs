import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.join(__dirname, 'w3c-color-name-hex.json');
const outPath = path.join(__dirname, '../src/config/w3cColorKeywords.ts');

const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const entries = Object.entries(j)
  .map(([k, v]) => `  '${k}': '${v}',`)
  .join('\n');

const src = `/**
 * Mots-clés nommés CSS (W3C CSS Color Module / SVG) → hex.
 * Source des RGB : package \`color-name\` (MIT), aligné sur la spec.
 * @see https://www.w3.org/TR/css-color-4/#named-colors
 */
export const W3C_CSS_NAMED_COLORS: Record<string, string> = {
${entries}
};

const NORMALIZE = /[\\s_-]+/g;

/** Synonymes FR / formes composées → clé W3C (sans accents, sans espaces). */
const ALIAS_TO_W3C_KEY: Record<string, string> = {
  sarcelle: 'teal',
  cramoisi: 'crimson',
  bleumarine: 'navy',
  bleunuit: 'midnightblue',
  bleuroi: 'royalblue',
  bleuciel: 'skyblue',
  bleuacier: 'steelblue',
  vertforet: 'forestgreen',
  vertolive: 'olivedrab',
  orangerouge: 'orangered',
  rosechaud: 'hotpink',
  dore: 'gold',
  argente: 'silver',
};

function normalizeSearchKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\\p{M}/gu, '')
    .replace(NORMALIZE, '');
}

/**
 * Recherche insensible à la casse et aux accents ; accepte « steel blue », « bleu marine ».
 * Aligné sur les mots-clés nommés CSS (W3C).
 */
export function lookupW3cCssColorHex(query: string): string | null {
  let key = normalizeSearchKey(query);
  if (key.length < 2) return null;
  key = ALIAS_TO_W3C_KEY[key] ?? key;
  return W3C_CSS_NAMED_COLORS[key] ?? null;
}
`;

fs.writeFileSync(outPath, src, 'utf8');
console.log('wrote', outPath);
