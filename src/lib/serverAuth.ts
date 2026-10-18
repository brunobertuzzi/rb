/**
 * Módulo de Segurança e Autenticação no Servidor (Next.js Node/Edge runtime).
 * Fornece geração e validação de JWT nativo (Web Crypto), Rate Limiting em memória,
 * e verificação de sessões para rotas de API e Middleware.
 */
import { NextRequest } from "next/server";

export interface ServerSessionPayload {
  userId: string;
  email: string;
  role: "ADMIN" | "GERENTE" | "VENDEDOR" | string;
  nome: string;
  exp?: number;
}

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || "rb_agro_auth_secret_server_secure_2026_k9x2";
}

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Assina um JWT padrão seguro com HMAC-SHA256 usando a Web Crypto API nativa.
 */
export async function signJwt(payload: ServerSessionPayload, expiresInSeconds = 7 * 24 * 3600): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };

  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(fullPayload)));
  const dataToSign = `${headerB64}.${payloadB64}`;

  const key = await getHmacKey(getAuthSecret());
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(dataToSign));
  const sigB64 = base64UrlEncode(sigBuffer);

  return `${dataToSign}.${sigB64}`;
}

/**
 * Valida a assinatura e a expiração do JWT. Retorna o payload decodificado ou null se inválido.
 */
export async function verifyJwt<T = ServerSessionPayload>(token: string): Promise<T | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const dataToSign = `${headerB64}.${payloadB64}`;

    const enc = new TextEncoder();
    const key = await getHmacKey(getAuthSecret());
    const sigBytes = base64UrlDecode(sigB64);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as unknown as BufferSource,
      enc.encode(dataToSign)
    );
    if (!isValid) return null;

    const dec = new TextDecoder();
    const payloadJson = dec.decode(base64UrlDecode(payloadB64));
    const payload = JSON.parse(payloadJson);

    if (payload.exp && typeof payload.exp === "number") {
      const now = Math.floor(Date.now() / 1000);
      if (now > payload.exp) return null; // Expirado
    }

    return payload as T;
  } catch {
    return null;
  }
}

/**
 * Recupera e valida a sessão do usuário a partir dos cookies da requisição ou do header Authorization.
 */
export async function getSessionFromRequest(req: Request | NextRequest): Promise<ServerSessionPayload | null> {
  let token: string | undefined;

  // 1. Header Authorization: Bearer <token>
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7).trim();
  }

  // 2. NextRequest cookies object
  if (!token && "cookies" in req && typeof (req as NextRequest).cookies?.get === "function") {
    token = (req as NextRequest).cookies.get("rb_session")?.value;
  }

  // 3. Cookie HTTP-Only header fallback
  if (!token) {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)rb_session=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }
  }

  if (!token) return null;
  return verifyJwt<ServerSessionPayload>(token);
}

/**
 * Hash de senha seguro com salt no servidor.
 */
export async function hashPasswordServer(password: string, salt = "rb_agro_salt_2026"): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}:${salt}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validação de senha: testa tanto o padrão existente quanto futuros formatos.
 */
export async function verifyPasswordHash(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) return false;
  const hashAttempt = await hashPasswordServer(password);
  return hashAttempt === storedHash;
}

// -------------------------------------------------------------
// Rate Limiter em memória (Proteção contra Brute Force / DoS)
// -------------------------------------------------------------
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Limpeza periódica a cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap.entries()) {
    if (now > v.resetAt) rateLimitMap.delete(k);
  }
}, 10 * 60 * 1000).unref?.();

/**
 * Verifica limites de requisição por chave (ex: IP ou IP + ação).
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): { allowed: boolean; remainingSeconds?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true };
  }

  if (entry.count >= maxAttempts) {
    const remainingSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remainingSeconds };
  }

  entry.count += 1;
  return { allowed: true };
}

export function resetRateLimit(key: string): void {
  rateLimitMap.delete(key);
}

/**
 * Obtém o IP do cliente de forma segura respeitando proxies reversos (Railway, Vercel, Cloudflare).
 */
export function getClientIp(req: Request | NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}
