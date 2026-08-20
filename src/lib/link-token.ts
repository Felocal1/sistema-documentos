const LINK_SECRET =
  process.env.CLIENT_LINK_SECRET || process.env.NEXTAUTH_SECRET || "dev-link-secret";

const DEFAULT_TTL_DAYS = Number(process.env.CLIENT_LINK_TTL_DAYS || 7);

export interface LinkTokenPayload {
  clientId: string;
  exp: number;
}

// --- Web Crypto helpers (Edge Runtime compatible) ---

function bytesToBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBytes(b64: string): Uint8Array {
  let base64 = b64.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64urlEncode(str: string): string {
  return bytesToBase64url(new TextEncoder().encode(str));
}

function base64urlDecode(b64: string): string {
  return new TextDecoder().decode(base64urlToBytes(b64));
}

async function hmacSign(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// --- Token functions ---

// Gera um token assinado (HMAC-SHA256) que dá acesso à tela de anexos de um cliente.
export async function createClientLink(
  clientId: string,
  ttlDays: number = DEFAULT_TTL_DAYS
): Promise<{ token: string; expiresAt: Date }> {
  const exp = Date.now() + ttlDays * 24 * 60 * 60 * 1000;
  const payload = `${clientId}.${exp}`;
  const signatureBytes = await hmacSign(LINK_SECRET, payload);
  const token = `${base64urlEncode(payload)}.${bytesToBase64url(signatureBytes)}`;
  return { token, expiresAt: new Date(exp) };
}

// Valida assinatura e expiração do token. Retorna null se inválido/expirado.
export async function verifyClientLink(token: string): Promise<LinkTokenPayload | null> {
  try {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) return null;

    const payload = base64urlDecode(encodedPayload);
    const [clientId, expStr] = payload.split(".");
    const exp = Number(expStr);
    if (!clientId || !exp || exp < Date.now()) return null;

    const expectedBytes = await hmacSign(LINK_SECRET, payload);
    const actualBytes = base64urlToBytes(signature);

    if (!timingSafeEqual(expectedBytes, actualBytes)) return null;

    return { clientId, exp };
  } catch {
    return null;
  }
}

// Converte o token em URL completa para a tela de anexos do cliente.
export function buildClientLinkUrl(
  clientId: string,
  token: string,
  origin?: string
): string {
  const base = origin || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/clients/${clientId}?linkToken=${encodeURIComponent(token)}`;
}
