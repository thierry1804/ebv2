import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { buildFirstProductImageByCategoryName } from '../../lib/firstProductImageByCategory';
import type { Category, Product } from '../../types';

const MAX_COLUMNS_PER_ROW = 6;

/** Largeur min. d’une colonne (px) — évite les colonnes trop fines pour les libellés. */
const COLUMN_MIN_PX = 118;

/** Poids d’une colonne = somme des produits des catégories (min. 1 pour garder des largeurs visibles). */
function columnWeight(columnItems: Category[], counts: Map<string, number>): number {
  let sum = 0;
  for (const c of columnItems) {
    sum += counts.get(c.name) ?? 0;
  }
  return Math.max(1, sum);
}

/**
 * Réduit les écarts extrêmes (ex. 1 vs 80 produits) pour que les colonnes restent lisibles,
 * tout en gardant les catégories plus fournies un peu plus larges.
 */
function spreadFrUnits(weights: number[]): number[] {
  return weights.map((w) => Math.sqrt(w) + 1.75);
}

function rowGridTemplateColumns(weights: number[]): string {
  const frs = spreadFrUnits(weights);
  return frs.map((f) => `minmax(${COLUMN_MIN_PX}px, ${f}fr)`).join(' ');
}

/** Découpe les catégories en lignes ; chaque ligne alterne colonnes « 2 vignettes » et « 1 vignette haute » (style Kiabi). */
function buildRows(categories: Category[]): Category[][][] {
  const rows: Category[][][] = [];
  const remaining = [...categories];
  while (remaining.length > 0) {
    const row: Category[][] = [];
    let col = 0;
    while (remaining.length > 0 && row.length < MAX_COLUMNS_PER_ROW) {
      if (col % 2 === 0) {
        const n = Math.min(2, remaining.length);
        row.push(remaining.splice(0, n));
      } else {
        row.push(remaining.splice(0, 1));
      }
      col++;
    }
    rows.push(row);
  }
  return rows;
}

function CategoryTile({
  category,
  fallbackImageUrl,
}: {
  category: Category;
  fallbackImageUrl: string | undefined;
}) {
  const categoryImage = category.image?.trim() || undefined;
  const initialSrc =
    categoryImage && categoryImage.length > 0 ? categoryImage : fallbackImageUrl ?? null;
  const [displaySrc, setDisplaySrc] = useState<string | null>(initialSrc);

  useEffect(() => {
    const cat = category.image?.trim() || undefined;
    setDisplaySrc(cat && cat.length > 0 ? cat : fallbackImageUrl ?? null);
  }, [category.id, category.image, fallbackImageUrl]);

  const handleImgError = () => {
    setDisplaySrc((prev) => {
      const cat = category.image?.trim() || undefined;
      if (prev && cat && prev === cat && fallbackImageUrl && prev !== fallbackImageUrl) {
        return fallbackImageUrl;
      }
      return null;
    });
  };

  return (
    <Link
      to={`/boutique?category=${category.slug}`}
      aria-label={category.name}
      className="group relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-neutral-support shadow-md transition-shadow duration-300 hover:shadow-xl"
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-neutral-support to-neutral-support/50 animate-pulse"
        aria-hidden="true"
      />
      <div className="relative min-h-0 w-full flex-1">
        {displaySrc ? (
          <img
            key={displaySrc}
            src={displaySrc}
            alt=""
            className="absolute inset-0 z-10 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            onError={handleImgError}
            onLoad={(e) => {
              const placeholder = e.currentTarget.closest('a')?.querySelector('.animate-pulse');
              placeholder?.classList.add('opacity-0', 'transition-opacity', 'duration-300');
            }}
          />
        ) : (
          <div
            className="absolute inset-0 z-10 bg-gradient-to-br from-neutral-support to-primary/10"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-start p-2 pb-3 md:p-3 md:pb-4">
        <span
          className="line-clamp-2 max-w-[min(100%,calc(100%-0.5rem))] break-words rounded-2xl bg-white px-2.5 py-1.5 text-left text-[10px] font-bold leading-snug text-text-dark shadow-sm [overflow-wrap:anywhere] md:rounded-3xl md:px-3.5 md:py-2 md:text-[11px] lg:text-xs"
          title={category.name}
        >
          {category.name}
        </span>
      </div>
    </Link>
  );
}

export function CategoryKiabiGrid({
  categories,
  productCountByCategory,
  products,
}: {
  categories: Category[];
  productCountByCategory: Map<string, number>;
  products: Product[];
}) {
  const firstProductImageByCategory = useMemo(
    () => buildFirstProductImageByCategoryName(products),
    [products]
  );

  const rows = buildRows(categories);

  return (
    <div className="space-y-4 md:space-y-6">
      {rows.map((row, rowIndex) => {
        const weights = row.map((columnItems) => columnWeight(columnItems, productCountByCategory));

        const gridCols = rowGridTemplateColumns(weights);

        return (
          <div
            key={rowIndex}
            className="grid h-[300px] w-full min-w-0 gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] sm:h-[360px] md:h-[420px] md:gap-5 lg:h-[460px] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-support"
            style={{ gridTemplateColumns: gridCols }}
          >
            {row.map((columnItems) => (
              <div
                key={columnItems.map((c) => c.id).join('-')}
                className="flex min-h-0 min-w-0 flex-col gap-3 md:gap-4"
              >
                {columnItems.map((category) => (
                  <CategoryTile
                    key={category.id}
                    category={category}
                    fallbackImageUrl={firstProductImageByCategory.get(category.name)}
                  />
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
