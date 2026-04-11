import { createContext, useContext } from 'react';

/** Référence du `<main>` scrollable du layout admin (défilement page + curseur rapide). */
export const AdminMainScrollContext = createContext<React.RefObject<HTMLElement | null> | null>(null);

export function useAdminMainScrollRef() {
  return useContext(AdminMainScrollContext);
}
