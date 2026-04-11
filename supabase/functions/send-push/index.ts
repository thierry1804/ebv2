// Supabase Edge Function — Envoie des push notifications aux admins
// Déclenchée par un Database Webhook sur INSERT dans chat_messages
//
// Secrets requis (Dashboard > Edge Functions > Secrets) :
//   VAPID_PRIVATE_KEY  — clé privée VAPID (base64url, 32 octets)
//   VAPID_PUBLIC_KEY   — clé publique VAPID (base64url, 65 octets non compressés)
//   (SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ─── Utilitaires base64url ──────────────────────────────────────────

function b64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64UrlDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// ─── VAPID JWT (ES256) ──────────────────────────────────────────────

async function signVapid(
  audience: string,
  subject: string,
  pubB64: string,
  privB64: string,
): Promise<string> {
  const header = b64UrlEncode(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const now = Math.floor(Date.now() / 1000);
  const claims = b64UrlEncode(new TextEncoder().encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: subject })));
  const unsigned = `${header}.${claims}`;

  const rawPub = b64UrlDecode(pubB64);
  const x = b64UrlEncode(rawPub.slice(1, 33));
  const y = b64UrlEncode(rawPub.slice(33, 65));
  const d = b64UrlEncode(b64UrlDecode(privB64));

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const derSig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned)));
  const raw = derToRaw(derSig);
  return `${unsigned}.${b64UrlEncode(raw)}`;
}

/** Convertit signature DER → r||s (64 octets) */
function derToRaw(der: Uint8Array): Uint8Array {
  if (der[0] !== 0x30) return der; // déjà raw
  const rLen = der[3];
  let r = der.slice(4, 4 + rLen);
  const sLen = der[4 + rLen + 1];
  let s = der.slice(4 + rLen + 2, 4 + rLen + 2 + sLen);
  if (r.length > 32) r = r.slice(r.length - 32);
  if (s.length > 32) s = s.slice(s.length - 32);
  const out = new Uint8Array(64);
  out.set(r, 32 - r.length);
  out.set(s, 64 - s.length);
  return out;
}

// ─── Chiffrement Web Push (RFC 8291 aes128gcm) ─────────────────────

async function encryptPush(
  p256dh: string,
  auth: string,
  payload: string,
): Promise<Uint8Array> {
  const clientPub = b64UrlDecode(p256dh);
  const clientAuth = b64UrlDecode(auth);
  const plaintext = new TextEncoder().encode(payload);

  // Générer paire ECDH serveur éphémère
  const serverKP = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", serverKP.publicKey));

  // Importer clé publique client
  const clientKey = await crypto.subtle.importKey("raw", clientPub, { name: "ECDH", namedCurve: "P-256" }, false, []);

  // Shared secret ECDH
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: clientKey }, serverKP.privateKey, 256));

  // Salt aléatoire 16 octets
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // --- Dérivation IKM (RFC 8291 §3.4) ---
  // IKM = HKDF-Extract(salt=auth, IKM=ecdh_secret)
  // puis HKDF-Expand(PRK=ikm_prk, info="WebPush: info\0" || client_pub || server_pub, L=32)
  const ikmPrk = await hmac(clientAuth, sharedSecret);
  const webpushInfo = concat(
    new TextEncoder().encode("WebPush: info\0"),
    clientPub,
    serverPubRaw,
  );
  const ikm = await hkdfExpand(ikmPrk, concat(webpushInfo, new Uint8Array([1])), 32);

  // --- Dérivation CEK et nonce (RFC 8188) ---
  // PRK = HKDF-Extract(salt=salt, IKM=ikm)
  const prk = await hmac(salt, ikm);

  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const cek = await hkdfExpand(prk, concat(cekInfo, new Uint8Array([1])), 16);

  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const nonce = await hkdfExpand(prk, concat(nonceInfo, new Uint8Array([1])), 12);

  // Padding : payload || 0x02
  const padded = new Uint8Array(plaintext.length + 1);
  padded.set(plaintext);
  padded[plaintext.length] = 2;

  // AES-128-GCM
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded));

  // aes128gcm body : salt(16) || rs(4, big-endian) || idlen(1) || keyid(65) || ciphertext
  const rs = 4096;
  const result = new Uint8Array(16 + 4 + 1 + serverPubRaw.length + ciphertext.length);
  result.set(salt, 0);
  new DataView(result.buffer).setUint32(16, rs);
  result[20] = serverPubRaw.length;
  result.set(serverPubRaw, 21);
  result.set(ciphertext, 21 + serverPubRaw.length);
  return result;
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = new Uint8Array(await crypto.subtle.sign("HMAC", k, info));
  return signed.slice(0, length);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

// ─── Handler principal ──────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    // Vérification d'authentification :
    // Les Database Webhooks Supabase envoient le service_role JWT dans le header Authorization.
    // On vérifie que l'appel vient bien de Supabase (pas d'un tiers).
    const authHeader = req.headers.get("Authorization") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    // Le webhook envoie "Bearer <service_role_key>" — vérifier que c'est bien notre clé
    // Alternativement, vérifier un secret custom via WEBHOOK_SECRET
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    if (webhookSecret) {
      // Si un secret webhook est configuré, le vérifier via header custom
      const reqSecret = req.headers.get("x-webhook-secret") || "";
      if (reqSecret !== webhookSecret) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (authHeader) {
      // Vérifier que le Bearer token correspond au service_role_key
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (token !== serviceKey) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json();
    const record = body.record || body;

    // Seulement les messages client
    if (record.sender_role !== "customer") {
      return Response.json({ skipped: true });
    }

    // Validation basique du payload
    if (!record.conversation_id || typeof record.content !== "string") {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }

    const conversationId: string = record.conversation_id;
    const content: string = (record.content || "").slice(0, 200); // tronquer pour la notif

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPub = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPriv = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const sb = createClient(supabaseUrl, serviceKey);

    // Info conversation
    const { data: conv } = await sb
      .from("chat_conversations")
      .select("customer_name, product_name")
      .eq("id", conversationId)
      .single();

    const title = `💬 ${conv?.customer_name || "Client"} — ${conv?.product_name || "Produit"}`;
    const pushBody = content.length > 120 ? content.slice(0, 120) + "…" : content;

    // Tous les abonnements push
    const { data: subs } = await sb.from("push_subscriptions").select("*");
    if (!subs || subs.length === 0) {
      return Response.json({ sent: 0, reason: "no_subscriptions" });
    }

    const payloadJson = JSON.stringify({
      title,
      body: pushBody,
      conversation_id: conversationId,
      url: "/admin/chat",
    });

    let sent = 0;
    const errors: string[] = [];

    for (const sub of subs) {
      try {
        const ep = new URL(sub.endpoint);
        const audience = `${ep.protocol}//${ep.host}`;
        const jwt = await signVapid(audience, "mailto:contact@duoimport.mg", vapidPub, vapidPriv);

        const encrypted = await encryptPush(sub.keys_p256dh, sub.keys_auth, payloadJson);

        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            Authorization: `vapid t=${jwt}, k=${vapidPub}`,
            TTL: "86400",
            Urgency: "high",
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
          },
          body: encrypted,
        });

        if (res.status === 201 || res.status === 200) {
          sent++;
        } else if (res.status === 404 || res.status === 410) {
          await sb.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          errors.push(`expired:${sub.endpoint.slice(0, 40)}`);
        } else {
          errors.push(`HTTP ${res.status}`);
        }
      } catch (e) {
        errors.push((e as Error).message);
      }
    }

    return Response.json({ sent, total: subs.length, errors });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
});
