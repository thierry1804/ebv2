// Formatage de la devise Ariary (MGA)
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

// Formatage des nombres avec séparateurs
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('fr-MG').format(num);
};

