/**
 * Analyse d'image produit via Hugging Face (routeur OpenAI-compatible).
 * Le token est lu côté client (VITE_HF_API_TOKEN) : à migrer vers un backend pour la prod.
 */

import { blobToJpegDataUrlForVision } from '../utils/visionImageEncode';

const HF_CHAT_URL = 'https://router.huggingface.co/v1/chat/completions';

export function getHfVisionModel(): string {
  return (import.meta.env.VITE_HF_VISION_MODEL as string | undefined)?.trim() || 'Qwen/Qwen3-VL-8B-Instruct';
}

function extractJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fence ? fence[1] : trimmed).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Réponse modèle sans objet JSON exploitable');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate.slice(start, end + 1)) as unknown;
  } catch {
    throw new Error(
      "Le modèle n'a pas renvoyé un JSON valide. Réessayez ou vérifiez VITE_HF_VISION_MODEL.",
    );
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error("Le JSON parsé n'est pas un objet.");
  }
  return parsed as Record<string, unknown>;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('Lecture image'));
    r.readAsDataURL(blob);
  });
}

/**
 * Charge l'image dans le navigateur → data URL (même origine ou CORS autorisé).
 * À éviter pour une URL absolue cross-domain sans CORS : utiliser {@link resolveImageInputForVisionModel}.
 */
export async function loadImageAsDataUrl(imageUrl: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(imageUrl, { mode: 'cors', credentials: 'omit' });
  } catch {
    throw new Error(
      "Téléchargement de l'image bloqué (réseau ou CORS). Les URL en https:// absolue sont envoyées directement à Hugging Face sans fetch côté boutique.",
    );
  }
  if (!res.ok) {
    throw new Error(`Impossible de charger l'image (HTTP ${res.status}).`);
  }
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.startsWith('image/')) {
    throw new Error(`La réponse n'est pas une image (content-type: ${ct || 'absent'}).`);
  }
  const blob = await res.blob();
  return blobToDataUrl(blob);
}

/**
 * Prépare la valeur passée au 1er appel HF.
 * - URL `https://` / `http://` : **aucun fetch navigateur** vers l’API (évite CORS) ; Hugging Face télécharge l’URL.
 * - Chemin relatif (dev) : fetch même origine → data URL.
 *
 * Le chargement same-origin + JPEG est géré dans {@link analyzeVisionProductImage}, pas ici.
 */
export async function resolveImageInputForVisionModel(imageUrl: string): Promise<string> {
  const u = imageUrl.trim();
  if (!u) {
    throw new Error("URL d'image vide.");
  }
  if (/^https?:\/\//i.test(u)) {
    return u;
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const absolute = u.startsWith('/')
    ? `${origin}${u}`
    : new URL(u, origin || 'http://localhost').href;
  return loadImageAsDataUrl(absolute);
}

/**
 * Même chemin `/api/images/…` sur l'origine du front (ex. nginx qui proxy vers l'API images).
 * Permet un `fetch` navigateur sans CORS, puis envoi en data URL à Hugging Face si l'URL
 * directe `https://api…/api/images/…` n'est pas lisible par les serveurs HF.
 *
 * `VITE_VISION_IMAGE_FETCH_ORIGIN` (optionnel) : origine forcée si l'admin n'est pas sur le domaine boutique.
 */
export function buildSameOriginMirrorImageUrl(absoluteImageApiUrl: string): string | null {
  const trimmed = absoluteImageApiUrl.trim();
  const originOverride = (import.meta.env.VITE_VISION_IMAGE_FETCH_ORIGIN as string | undefined)
    ?.trim()
    .replace(/\/$/, '');
  const winOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const origin = originOverride || winOrigin;
  if (!origin) return null;
  try {
    const u = new URL(trimmed);
    if (!u.pathname.startsWith('/api/images/')) return null;
    return `${origin}${u.pathname}${u.search}${u.hash}`;
  } catch {
    return null;
  }
}

function isHfRemoteImageRejected(error: unknown): boolean {
  const m = `${error instanceof Error ? error.message : ''}`.toLowerCase();
  return (
    m.includes('could not be processed') ||
    m.includes('possibly corrupt') ||
    m.includes('invalid image') ||
    m.includes('unable to process') ||
    m.includes('error processing image') ||
    m.includes('image(s)')
  );
}

function combineVisionImageErrors(primary: unknown, secondary: unknown): Error {
  const a = primary instanceof Error ? primary.message : String(primary);
  const b = secondary instanceof Error ? secondary.message : String(secondary);
  return new Error(
    `L'IA n'a pas pu lire l'image (URL distante). Seconde tentative via votre site : ${b}\n\nDétail initial : ${a}\n\nSi le problème persiste : exposez les images en https public, ou configurez un proxy /api/images/ sur le domaine de la boutique (voir VITE_VISION_IMAGE_FETCH_ORIGIN).`,
  );
}

function canonicalHref(u: string): string {
  try {
    return new URL(u).href.replace(/\/$/, '');
  } catch {
    return u.trim().replace(/\/$/, '');
  }
}

/** Data URL → JPEG redimensionné (WebP / PNG mal supportés par certains routeurs HF). */
async function dataUrlToJpegForHf(dataUrl: string): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return blobToJpegDataUrlForVision(blob);
}

async function analyzeProductImageWithHFMaybeJpegData(
  imageUrlForModel: string,
  rest: Omit<Parameters<typeof analyzeProductImageWithHF>[0], 'imageUrlForModel'>,
): Promise<AnalyzeProductImageResult> {
  const trimmed = imageUrlForModel.trim();
  const payload = trimmed.toLowerCase().startsWith('data:')
    ? await dataUrlToJpegForHf(trimmed)
    : trimmed;
  return analyzeProductImageWithHF({ imageUrlForModel: payload, ...rest });
}

async function fetchMirrorBlob(mirrorUrl: string): Promise<Blob> {
  const res = await fetch(mirrorUrl, { mode: 'cors', credentials: 'omit' });
  if (!res.ok) {
    throw new Error(`Chargement miroir HTTP ${res.status}`);
  }
  const ct = (res.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? '';
  if (ct.startsWith('text/')) {
    throw new Error(
      `Le miroir « ${mirrorUrl} » renvoie du HTML (${ct}), pas une image : nginx sert probablement index.html pour /api/images/. Ajoutez un proxy « location /api/images/ » vers votre API (voir nginx.conf.example à la racine du dépôt).`,
    );
  }
  const blob = await res.blob();
  const blobType = (blob.type ?? '').split(';')[0]?.trim() ?? '';
  if (
    blobType.startsWith('text/') ||
    (blobType && !blobType.startsWith('image/') && blobType !== 'application/octet-stream')
  ) {
    throw new Error(
      `Réponse miroir inattendue (${blobType || ct || 'type inconnu'}). Vérifiez le proxy /api/images/.`,
    );
  }
  return blob;
}

/**
 * Analyse vision : préfère JPEG (via miroir same-origin si besoin), car HF rejette souvent le WebP
 * ou les grosses data URLs brutes. Repli URL directe api.* puis seconde taille JPEG plus petite.
 */
export async function analyzeVisionProductImage(params: {
  normalizedImageUrl: string;
  categoryNames: string[];
  apiToken: string;
  model?: string;
}): Promise<AnalyzeProductImageResult> {
  if (import.meta.env.VITE_VISION_ANALYZE_EDGE === 'true') {
    const { analyzeVisionProductImageEdge } = await import('./visionProductEdge');
    return analyzeVisionProductImageEdge({
      normalizedImageUrl: params.normalizedImageUrl.trim(),
      categoryNames: params.categoryNames,
      model: params.model ?? getHfVisionModel(),
    });
  }

  const { normalizedImageUrl, ...rest } = params;
  const url = normalizedImageUrl.trim();

  const remoteOrData = await resolveImageInputForVisionModel(url);
  const mirror = buildSameOriginMirrorImageUrl(url);
  const remoteIsDirectHttp =
    /^https?:\/\//i.test(remoteOrData) && !remoteOrData.trim().toLowerCase().startsWith('data:');
  const mirrorDistinct =
    Boolean(mirror && remoteIsDirectHttp) &&
    Boolean(mirror && canonicalHref(mirror) !== canonicalHref(remoteOrData));

  if (mirrorDistinct && mirror) {
    try {
      const blob = await fetchMirrorBlob(mirror);
      const jpeg = await blobToJpegDataUrlForVision(blob, 1280, 0.88);
      return await analyzeProductImageWithHF({ imageUrlForModel: jpeg, ...rest });
    } catch {
      /* fetch ou HF : tenter URL directe puis repli plus agressif */
    }
  }

  try {
    return await analyzeProductImageWithHFMaybeJpegData(remoteOrData, rest);
  } catch (e) {
    if (!remoteIsDirectHttp || !isHfRemoteImageRejected(e)) {
      throw e;
    }

    if (!mirrorDistinct || !mirror) {
      throw new Error(
        `${e instanceof Error ? e.message : 'Erreur'}\n\nHugging Face n'a pas pu traiter cette image (URL distante ou format). Vérifiez un proxy \`/api/images/\` sur le domaine boutique, ou VITE_VISION_IMAGE_FETCH_ORIGIN.`,
      );
    }

    try {
      const blob = await fetchMirrorBlob(mirror);
      const jpeg = await blobToJpegDataUrlForVision(blob, 768, 0.82);
      return await analyzeProductImageWithHF({ imageUrlForModel: jpeg, ...rest });
    } catch (e2) {
      if (isHfRemoteImageRejected(e2)) {
        try {
          const blob = await fetchMirrorBlob(mirror);
          const jpegTiny = await blobToJpegDataUrlForVision(blob, 512, 0.8);
          return await analyzeProductImageWithHF({ imageUrlForModel: jpegTiny, ...rest });
        } catch (e3) {
          throw combineVisionImageErrors(e, e3);
        }
      }
      throw combineVisionImageErrors(e, e2);
    }
  }
}

export function pickCategoryFromVisionJson(parsed: Record<string, unknown>): string {
  const v = parsed['catégorie'] ?? parsed.categorie ?? parsed.category;
  if (typeof v === 'string') return v.trim();
  return '';
}

export interface AnalyzeProductImageResult {
  /** Objet JSON parsé (clés variables selon le modèle). */
  parsed: Record<string, unknown>;
  /** Texte brut renvoyé par le modèle. */
  rawContent: string;
}

export async function analyzeProductImageWithHF(params: {
  /** URL `https://…` publique **ou** data URL `data:image/…;base64,…`. */
  imageUrlForModel: string;
  categoryNames: string[];
  apiToken: string;
  model?: string;
}): Promise<AnalyzeProductImageResult> {
  const { imageUrlForModel, categoryNames, apiToken, model = getHfVisionModel() } = params;

  const list = categoryNames.filter(Boolean);
  const listText = list.length > 0 ? list.join(' | ') : '(aucune catégorie en base — propose un nom court en français)';

  const prompt = `Analyse cette photo de produit e-commerce.
Réponds par UN SEUL objet JSON valide, sans markdown, sans texte avant ou après.
Toutes les chaînes libres en français.
Clés exactes : "nom", "categorie", "description", "composition", "marque", "tailles", "couleurs"
— "tailles" : chaîne avec tailles séparées par des virgules si visibles, sinon "".
— "couleurs" : tableau de noms de couleurs en français (peut être vide).
— "categorie" : nom de rayon le plus pertinent. Catégories déjà utilisées dans la boutique : ${listText}.
Choisis de préférence une valeur identique ou très proche d'un libellé de cette liste (même mot, accents corrects).
Si aucune ne convient vraiment, propose un nom court et clair en français (une seule chaîne).`;

  const res = await fetch(HF_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1536,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrlForModel } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  });

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const errObj = body.error as { message?: string } | undefined;
    const msg =
      (typeof body.error === 'string' && body.error) ||
      errObj?.message ||
      `Réponse Hugging Face HTTP ${res.status}`;
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Accès refusé par Hugging Face (${res.status}). Vérifiez VITE_HF_API_TOKEN.`);
    }
    if (res.status === 429) {
      throw new Error('Trop de requêtes vers Hugging Face. Patientez puis réessayez.');
    }
    if (res.status === 503 || res.status === 502) {
      throw new Error('Service Hugging Face temporairement indisponible. Réessayez plus tard.');
    }
    throw new Error(msg);
  }

  const choices = body.choices as { message?: { content?: string } }[] | undefined;
  const rawContent = choices?.[0]?.message?.content ?? '';
  if (!rawContent.trim()) {
    throw new Error('Réponse vide du modèle');
  }

  const parsed = extractJsonObject(rawContent);
  return { parsed, rawContent };
}
