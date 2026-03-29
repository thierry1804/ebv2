/**
 * API d’images (disque côté serveur) — upload / suppression.
 * Variables : VITE_IMAGE_API_BASE_URL (ex. https://api.eshopbyvalsue.mg), VITE_IMAGE_API_KEY
 */

const baseUrl = (import.meta.env.VITE_IMAGE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const apiKey = (import.meta.env.VITE_IMAGE_API_KEY as string | undefined) ?? '';

export function isImageApiConfigured(): boolean {
  return Boolean(baseUrl && apiKey);
}

/**
 * Rend une URL affichable : l’API peut renvoyer un chemin relatif (/api/images/...)
 * ou une URL sur le mauvais host (boutique au lieu de api.*).
 */
export function normalizeImageApiUrl(input: string): string {
  if (!input?.trim() || !baseUrl) return input;
  const trimmed = input.trim();

  try {
    const base = new URL(baseUrl);
    const isAbsolute = /^https?:\/\//i.test(trimmed);
    const u = isAbsolute ? new URL(trimmed) : new URL(trimmed, base);

    if (u.pathname.startsWith('/api/images/')) {
      return `${base.origin}${u.pathname}${u.search}${u.hash}`;
    }

    return isAbsolute ? trimmed : u.href;
  } catch {
    return input;
  }
}

export function normalizeProductImageUrls(images: string[] | undefined | null): string[] {
  if (!images?.length) return [];
  return images.map((u) => normalizeImageApiUrl(u)).filter(Boolean);
}

export function isImageApiUrl(url: string): boolean {
  if (!baseUrl || !url) return false;
  try {
    const base = new URL(baseUrl);
    const u = /^https?:\/\//i.test(url) ? new URL(url) : new URL(url, base);
    return u.origin === base.origin && u.pathname.startsWith('/api/images/');
  } catch {
    return false;
  }
}

/** Chemin relatif après /api/images/ (ex. 1711743120000-abc123.webp) */
export function extractImageApiFilename(url: string): string | null {
  if (!baseUrl) return null;
  try {
    const base = new URL(baseUrl);
    const u = /^https?:\/\//i.test(url) ? new URL(url) : new URL(url, base);
    const m = u.pathname.match(/\/api\/images\/(.+)$/);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

export async function uploadImageToImageApi(file: File): Promise<string | null> {
  if (!isImageApiConfigured()) {
    console.error('Image API : VITE_IMAGE_API_BASE_URL et VITE_IMAGE_API_KEY requis');
    return null;
  }

  const formData = new FormData();
  formData.append('image', file, file.name);

  const res = await fetch(`${baseUrl}/api/images`, {
    method: 'POST',
    headers: { 'X-API-Key': apiKey },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Upload image (${res.status})`);
  }

  const data = (await res.json()) as { urls?: string[] };
  const urls = data.urls;
  if (!Array.isArray(urls) || urls.length === 0) return null;
  const first = urls[0];
  return first ? normalizeImageApiUrl(first) : null;
}

export async function deleteImageFromImageApi(imageUrl: string): Promise<boolean> {
  if (!isImageApiConfigured()) return false;
  const filename = extractImageApiFilename(imageUrl);
  if (!filename) return false;

  const res = await fetch(`${baseUrl}/api/images/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    headers: { 'X-API-Key': apiKey },
  });
  return res.ok;
}
