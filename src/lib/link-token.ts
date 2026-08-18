import { createHmac, timingSafeEqual } from "crypto";

const LINK_SECRET =
  process.env.CLIENT_LINK_SECRET || process.env.NEXTAUTH_SECRET || "dev-link-secret";

const DEFAULT_TTL_DAYS = Number(process.env.CLIENT_LINK_TTL_DAYS || 7);

export interface LinkTokenPayload {
  clientId: string;
  exp: number;
}

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

// Gera um token assinado (HMAC-SHA256) que dá acesso à tela de anexos de um cliente.
export function createClientLink(
  clientId: string,
  ttlDays: number = DEFAULT_TTL_DAYS
): { token: string; expiresAt: Date } {
  const exp = Date.now() + ttlDays * 24 * 60 * 60 * 1000;
  const payload = `${clientId}.${exp}`;
  const signature = base64url(createHmac("sha256", LINK_SECRET).update(payload).digest());
  const token = `${base64url(Buffer.from(payload))}.${signature}`;
  return { token, expiresAt: new Date(exp) };
}

// Valida assinatura e expiração do token. Retorna null se inválido/expirado.
export function verifyClientLink(token: string): LinkTokenPayload | null {
  try {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) return null;

    const payload = Buffer.from(encodedPayload, "base64url").toString();
    const [clientId, expStr] = payload.split(".");
    const exp = Number(expStr);
    if (!clientId || !exp || exp < Date.now()) return null;

    const expected = base64url(createHmac("sha256", LINK_SECRET).update(payload).digest());
    const a = Buffer.from(signature, "base64url");
    const b = Buffer.from(expected, "base64url");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

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
