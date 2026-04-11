/**
 * Prépare une image pour l’API vision Hugging Face : JPEG côté navigateur (meilleure compatibilité que WebP en data URL).
 */

function computeScaledSize(width: number, height: number, maxEdgePx: number): { w: number; h: number } {
  let w = width;
  let h = height;
  if (w <= 0 || h <= 0) {
    throw new Error('Image vide ou dimensions invalides.');
  }
  if (w > maxEdgePx || h > maxEdgePx) {
    if (w >= h) {
      h = Math.round((h * maxEdgePx) / w);
      w = maxEdgePx;
    } else {
      w = Math.round((w * maxEdgePx) / h);
      h = maxEdgePx;
    }
  }
  return { w, h };
}

function canvasToJpegDataUrl(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  maxEdgePx: number,
  quality: number,
): string {
  const { w, h } = computeScaledSize(sw, sh, maxEdgePx);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D indisponible pour l’encodage image.');
  }
  ctx.drawImage(source, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  if (!dataUrl.startsWith('data:image/jpeg')) {
    throw new Error('Conversion JPEG impossible (navigateur ou image).');
  }
  return dataUrl;
}

/** Repli si `createImageBitmap` refuse le WebP (ex. certaines versions Safari). */
async function blobToJpegViaHtmlImage(
  blob: Blob,
  maxEdgePx: number,
  quality: number,
): Promise<string> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.decoding = 'async';
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Décodage image impossible (fichier corrompu ou type non supporté).'));
      el.src = objectUrl;
    });
    return canvasToJpegDataUrl(img, img.naturalWidth, img.naturalHeight, maxEdgePx, quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function blobToJpegDataUrlForVision(
  blob: Blob,
  maxEdgePx = 1280,
  quality = 0.88,
): Promise<string> {
  try {
    const bitmap = await createImageBitmap(blob);
    try {
      return canvasToJpegDataUrl(bitmap, bitmap.width, bitmap.height, maxEdgePx, quality);
    } finally {
      bitmap.close();
    }
  } catch {
    return blobToJpegViaHtmlImage(blob, maxEdgePx, quality);
  }
}
