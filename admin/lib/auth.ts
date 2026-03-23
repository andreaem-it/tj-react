import { compare } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "admin_session";
const SESSION_DURATION_SEC = 60 * 60 * 24; // 24 ore

export type SessionPayload = { user: string; exp: number };

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET mancante o troppo corto (min 32 caratteri)");
  }
  return new TextEncoder().encode(secret);
}

export type VerifyResult =
  | { valid: true }
  | { valid: false; reason: "user" | "password" };

/** Restituisce l'hash da env: ADMIN_PASSWORD_HASH oppure decode di ADMIN_PASSWORD_HASH_B64 (evita problemi con $ in .env). */
function getAdminPasswordHash(): string | null {
  const raw = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (raw && raw.length > 0) return raw;
  const b64 = process.env.ADMIN_PASSWORD_HASH_B64?.trim();
  if (!b64) return null;
  try {
    return Buffer.from(b64, "base64").toString("utf8");
  } catch {
    return null;
  }
}

/** Verifica password in chiaro contro hash (env ADMIN_PASSWORD_HASH o ADMIN_PASSWORD_HASH_B64). */
export async function verifyAdminPassword(
  username: string,
  password: string
): Promise<VerifyResult> {
  const envUser = process.env.ADMIN_USER?.trim();
  const envHash = getAdminPasswordHash();
  if (!envUser || !envHash) return { valid: false, reason: "password" };
  if (username.trim() !== envUser) return { valid: false, reason: "user" };
  const match = await compare(password, envHash);
  return match ? { valid: true } : { valid: false, reason: "password" };
}

/** Crea JWT e restituisce il valore per il cookie. */
export async function createSession(username: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DURATION_SEC;
  const jwt = await new SignJWT({ user: username })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(exp)
    .sign(getSecret());
  return jwt;
}

/** Verifica cookie e restituisce il payload o null. Non lancia se AUTH_SECRET manca. */
export async function getSessionFromToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const secret = process.env.AUTH_SECRET;
    if (!secret || secret.length < 32) return null;
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    const user = payload.user as string;
    const exp = payload.exp as number;
    if (!user || !exp || exp < Date.now() / 1000) return null;
    return { user, exp };
  } catch {
    return null;
  }
}

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}

/** Per le route API admin: legge il cookie dalla request e restituisce la sessione o null. */
export async function getSessionFromRequest(
  request: Request
): Promise<SessionPayload | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;)\\s*${COOKIE_NAME}=([^;]*)`)
  );
  const token = match?.[1];
  if (!token) return null;
  return getSessionFromToken(token);
}

export function getSessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  maxAge: number;
  path: string;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_SEC,
    path: "/",
  };
}
