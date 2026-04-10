/** Téléphone mobile MG : 10 chiffres, ex. 0341234567 → affiché 034 12 345 67 */
export const MG_PHONE_DIGITS = 10;

/** Mobile malgache (10 chiffres, commence par 03). */
export const MG_PHONE_REGEX = /^03\d{8}$/;

/**
 * Affichage 03X XX XXX XX à partir des seuls chiffres.
 */
export function formatMgPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, MG_PHONE_DIGITS);
  if (d.length === 0) return '';
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)} ${d.slice(3)}`;
  if (d.length <= 8) return `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)}`;
}

export function normalizeMgPhoneDigits(input: string): string {
  return input.replace(/\D/g, '').slice(0, MG_PHONE_DIGITS);
}

export function isValidMgMobilePhone(digits: string): boolean {
  return MG_PHONE_REGEX.test(digits);
}

/** Code postal MG : uniquement des chiffres (souvent 3, ex. 101). */
export const MG_POSTAL_MAX_DIGITS = 5;

export function normalizeMgPostalCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, MG_POSTAL_MAX_DIGITS);
}

/** Champ optionnel : vide OK, sinon uniquement des chiffres 3 à 5. */
export function isValidMgPostalCodeOptional(digits: string): boolean {
  if (digits === '') return true;
  return /^\d{3,5}$/.test(digits);
}
