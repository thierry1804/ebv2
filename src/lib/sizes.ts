/**
 * Normalise les tailles / pointures depuis la BDD ou le JSON produit.
 * PostgREST renvoie souvent TEXT[] en tableau JS, mais selon les cas on peut recevoir
 * une chaîne ou un littéral style Postgres {a,b}.
 */
export function normalizeSizeList(raw: unknown): string[] {
  if (raw == null) return [];

  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }

  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return [];

    if (t.startsWith('[')) {
      try {
        const parsed = JSON.parse(t) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map((s) => String(s).trim()).filter(Boolean);
        }
      } catch {
        /* ignore */
      }
    }

    // Littéral tableau Postgres : {38,39,40} ou {"38","39"}
    if (t.startsWith('{') && t.endsWith('}')) {
      const inner = t.slice(1, -1).trim();
      if (!inner) return [];
      return inner
        .split(',')
        .map((s) => s.trim().replace(/^"(.*)"$/, '$1'))
        .filter(Boolean);
    }

    return t
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

/**
 * Option produit déjà dédiée au choix taille/pointure (évite doublon avec SizeSelector).
 * Correspondance stricte sur le nom — pas une sous-chaîne, sinon « Guide tailles » ou
 * « détail » masquaient abusivement tout le sélecteur.
 */
export function variantOptionIsDedicatedSize(optionName: string): boolean {
  const n = optionName.trim().toLowerCase();
  return /^(taille|tailles|pointure|pointures|size)$/.test(n);
}
