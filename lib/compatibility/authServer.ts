import { cookies } from "next/headers";
import { getSessionCookieName, getSessionFromToken } from "@/lib/auth";
import type { SessionPayload } from "@/lib/auth";

export async function getCompatibilityAdminSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(getSessionCookieName())?.value;
  if (!token) return null;
  return getSessionFromToken(token);
}
