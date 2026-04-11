/**
 * Analyse vision produit (admin) — contourne CORS / SPA sur le domaine boutique.
 *
 * Déploiement : `supabase functions deploy vision-product-analyze`
 *
 * Secrets (Dashboard > Edge Functions > Secrets) :
 *   HF_API_TOKEN          — token Hugging Face (read inference)
 *   IMAGE_API_KEY         — optionnel, header X-API-Key si GET /api/images/ l’exige
 *   VISION_IMAGE_ORIGIN_ALLOWLIST — optionnel, origines autorisées séparées par des virgules
 *       (défaut : https://api.eshopbyvalsue.mg)
 *
 * Variables auto : SUPABASE_URL, SUPABASE_ANON_KEY
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function base64Encode(buf: Uint8Array): string {
  let bin = "";
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin);
}

const HF_CHAT_URL = "https://router.huggingface.co/v1/chat/completions";
const DEFAULT_MODEL = "Qwen/Qwen3-VL-8B-Instruct";
const MAX_IMAGE_BYTES = 4_500_000;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function assertAllowedImageUrl(url: string): void {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error("URL d'image invalide");
  }
  if (u.protocol !== "https:") {
    throw new Error("Seules les URL https sont acceptées");
  }
  const raw = Deno.env.get("VISION_IMAGE_ORIGIN_ALLOWLIST")?.trim();
  const list = (raw && raw.length > 0
    ? raw.split(",").map((s) => s.trim()).filter(Boolean)
    : ["https://api.eshopbyvalsue.mg"]);
  const origin = u.origin;
  const ok = list.some((entry) => {
    try {
      return origin === new URL(entry).origin;
    } catch {
      return false;
    }
  });
  if (!ok) {
    throw new Error(`Origine d'image non autorisée : ${origin}. Configurez VISION_IMAGE_ORIGIN_ALLOWLIST.`);
  }
}

async function fetchImageAsDataUrl(imageUrl: string): Promise<string> {
  assertAllowedImageUrl(imageUrl);
  const apiKey = Deno.env.get("IMAGE_API_KEY")?.trim();
  const headers: Record<string, string> = {};
  if (apiKey) headers["X-API-Key"] = apiKey;

  const res = await fetch(imageUrl, { headers, redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Téléchargement image HTTP ${res.status}`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`Image trop volumineuse (max ${MAX_IMAGE_BYTES} octets)`);
  }
  const ct = (res.headers.get("content-type") ?? "application/octet-stream").split(";")[0]?.trim() ?? "";
  if (ct.startsWith("text/")) {
    throw new Error(`La réponse n'est pas une image (content-type: ${ct})`);
  }
  const mime = ct.startsWith("image/") ? ct : "image/jpeg";
  return `data:${mime};base64,${base64Encode(buf)}`;
}

function extractJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fence ? fence[1] : trimmed).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Réponse sans objet JSON exploitable");
  }
  const parsed = JSON.parse(candidate.slice(start, end + 1)) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON parsé invalide");
  }
  return parsed as Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return Response.json({ error: "Non authentifié" }, { status: 401, headers: corsHeaders });
    }

    const hfToken = Deno.env.get("HF_API_TOKEN")?.trim();
    if (!hfToken) {
      return Response.json({ error: "HF_API_TOKEN manquant sur la fonction" }, { status: 500, headers: corsHeaders });
    }

    const body = (await req.json()) as {
      imageUrl?: string;
      categoryNames?: string[];
      model?: string;
    };
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    if (!imageUrl) {
      return Response.json({ error: "imageUrl requis" }, { status: 400, headers: corsHeaders });
    }

    const categoryNames = Array.isArray(body.categoryNames)
      ? body.categoryNames.filter((x): x is string => typeof x === "string")
      : [];
    const listText = categoryNames.length > 0
      ? categoryNames.join(" | ")
      : "(aucune catégorie en base — propose un nom court en français)";
    const model = typeof body.model === "string" && body.model.trim()
      ? body.model.trim()
      : DEFAULT_MODEL;

    const imageDataUrl = await fetchImageAsDataUrl(imageUrl);

    const prompt = `Analyse cette photo de produit e-commerce.
Réponds par UN SEUL objet JSON valide, sans markdown, sans texte avant ou après.
Toutes les chaînes libres en français.
Clés exactes : "nom", "categorie", "description", "composition", "marque", "tailles", "couleurs"
— "tailles" : chaîne avec tailles séparées par des virgules si visibles, sinon "".
— "couleurs" : tableau de noms de couleurs en français (peut être vide).
— "categorie" : nom de rayon le plus pertinent. Catégories déjà utilisées dans la boutique : ${listText}.
Choisis de préférence une valeur identique ou très proche d'un libellé de cette liste (même mot, accents corrects).
Si aucune ne convient vraiment, propose un nom court et clair en français (une seule chaîne).`;

    const hfRes = await fetch(HF_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1536,
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageDataUrl } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    const hfBody = (await hfRes.json().catch(() => ({}))) as Record<string, unknown>;
    if (!hfRes.ok) {
      const errObj = hfBody.error as { message?: string } | undefined;
      const msg =
        (typeof hfBody.error === "string" && hfBody.error) ||
        errObj?.message ||
        `Hugging Face HTTP ${hfRes.status}`;
      return Response.json({ error: msg }, { status: 502, headers: corsHeaders });
    }

    const choices = hfBody.choices as { message?: { content?: string } }[] | undefined;
    const rawContent = choices?.[0]?.message?.content ?? "";
    if (!rawContent.trim()) {
      return Response.json({ error: "Réponse vide du modèle" }, { status: 502, headers: corsHeaders });
    }

    const parsed = extractJsonObject(rawContent);
    return Response.json({ parsed, rawContent }, { headers: corsHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }
});
