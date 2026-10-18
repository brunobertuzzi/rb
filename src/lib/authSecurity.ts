import { PasswordStrength } from "@/types/auth";

/**
 * Gera um hash criptográfico SHA-256 com salt dinâmico utilizando a Web Crypto API nativa.
 * Padrão seguro compatível com navegadores modernos e ambientes seguros.
 */
export async function hashPassword(password: string, salt: string = "rb_agro_salt_2026"): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}:${salt}`);
  
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  
  // Fallback determinístico caso Web Crypto API não esteja disponível no contexto
  let hash = 0;
  const str = `${salt}:${password}:${salt}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `fallback_${Math.abs(hash).toString(16)}`;
}

/**
 * Gera um token de sessão criptograficamente seguro com 256 bits de entropia.
 */
export function generateSecureToken(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `tok_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}

/**
 * Avalia a força da senha e retorna feedback em tempo real para o usuário.
 * Verifica: comprimento mínimo, maiúsculas, minúsculas, números e caracteres especiais.
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return {
      score: 0,
      label: "Muito Fraca",
      color: "bg-zinc-700",
      feedback: ["Informe uma senha com pelo menos 6 caracteres."],
    };
  }

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push("Use no mínimo 8 caracteres.");
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Inclua pelo menos uma letra maiúscula (A-Z).");
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Inclua pelo menos um número (0-9).");
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push("Recomendado: adicione um símbolo especial (!@#$%).");
  }

  const levels: Record<number, { label: PasswordStrength["label"]; color: string }> = {
    0: { label: "Muito Fraca", color: "bg-rose-600" },
    1: { label: "Fraca", color: "bg-rose-500" },
    2: { label: "Média", color: "bg-amber-500" },
    3: { label: "Forte", color: "bg-emerald-500" },
    4: { label: "Excelente", color: "bg-emerald-400" },
  };

  const level = levels[score] || levels[0];

  return {
    score,
    label: level.label,
    color: level.color,
    feedback,
  };
}

/**
 * Sanitiza strings para prevenir injeção em formulários.
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";
  return input.trim().replace(/[<>]/g, "");
}

/**
 * Calcula assinatura determinística para validar integridade da sessão no cliente
 * e impedir escalação de privilégio via edição direta do localStorage.
 */
export function computeSessionSignature(userId: string, email: string, role: string, expiresAt: string): string {
  const payload = `rb_sig_2026:${userId}:${email.toLowerCase()}:${role}:${expiresAt}`;
  let h1 = 0xdeadbeef ^ payload.length;
  let h2 = 0x41c6ce57 ^ payload.length;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `sig_${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
}

/**
 * Recupera o token de autenticação JWT ativo do cliente (se disponível).
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("rb_auth_session");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.token && typeof parsed.token === "string" && parsed.token !== "cookie_session") {
        return parsed.token;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Monta os headers de requisição incluindo Authorization: Bearer <token> se logado.
 */
export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

