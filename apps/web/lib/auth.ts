import { createHmac, timingSafeEqual } from "node:crypto";

export type AuthUser = { id: string; email: string; name: string };
type SessionPayload = AuthUser & { exp: number };

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET não configurado");
  return value;
}

function encode(value: string) { return Buffer.from(value).toString("base64url"); }
function signature(value: string) { return createHmac("sha256", secret()).update(value).digest("base64url"); }

export function createSession(user: AuthUser) {
  const payload = encode(JSON.stringify({ ...user, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 } satisfies SessionPayload));
  return `${payload}.${signature(payload)}`;
}

export function readSession(request: Request) {
  const value = request.headers.get("cookie")?.match(/(?:^|; )market013_session=([^;]+)/)?.[1];
  if (!value) return null;
  const [payload, providedSignature] = value.split(".");
  if (!payload || !providedSignature) return null;
  const expectedSignature = signature(payload);
  if (providedSignature.length !== expectedSignature.length || !timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionPayload;
    return session.exp > Date.now() ? session : null;
  } catch { return null; }
}

export function sessionCookie(value: string, maxAge = 60 * 60 * 24 * 30) {
  return `market013_session=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}