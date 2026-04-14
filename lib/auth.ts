import { jwtVerify } from "jose";

const COOKIE_NAME = "admin_session";
export type SessionPayload = { user: string; exp: number };

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
