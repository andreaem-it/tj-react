import { NextRequest, NextResponse } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const dynamic = "force-dynamic";

/** POST body JSON → tj-api (Brevo). */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.clone().json();
  } catch {
    return NextResponse.json({ error: "Payload JSON non valido" }, { status: 400 });
  }
  const email =
    typeof body === "object" && body !== null && "email" in body
      ? (body as { email?: unknown }).email
      : null;
  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return NextResponse.json({ error: "Email non valida" }, { status: 400 });
  }
  return proxyToTjApi(request, { timeoutMs: 30_000 });
}
