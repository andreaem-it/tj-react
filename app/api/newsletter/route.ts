import { NextRequest, NextResponse } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const dynamic = "force-dynamic";
const MAX_NEWSLETTER_PAYLOAD_BYTES = 8 * 1024;

/** POST body JSON → tj-api (Brevo). */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    const raw = await request.clone().text();
    if (Buffer.byteLength(raw, "utf8") > MAX_NEWSLETTER_PAYLOAD_BYTES) {
      return NextResponse.json({ error: "Payload troppo grande" }, { status: 413 });
    }
    body = JSON.parse(raw);
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
