import { NextRequest, NextResponse } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const dynamic = "force-dynamic";
const MAX_NEWSLETTER_PAYLOAD_BYTES = 8 * 1024;

/** POST body JSON → tj-api (Brevo). */
export async function POST(request: NextRequest) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Content-Type non supportato" }, { status: 415 });
  }
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
  const newsletterConsent =
    typeof body === "object" && body !== null && "newsletterConsent" in body
      ? (body as { newsletterConsent?: unknown }).newsletterConsent
      : null;
  const pixelTrackingConsent =
    typeof body === "object" && body !== null && "pixelTrackingConsent" in body
      ? (body as { pixelTrackingConsent?: unknown }).pixelTrackingConsent
      : null;
  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return NextResponse.json({ error: "Email non valida" }, { status: 400 });
  }
  if (newsletterConsent !== true) {
    return NextResponse.json(
      { error: "È necessario acconsentire alla ricezione della newsletter." },
      { status: 400 },
    );
  }
  if (typeof pixelTrackingConsent !== "boolean") {
    return NextResponse.json(
      { error: "La preferenza sul tracciamento deve essere indicata." },
      { status: 400 },
    );
  }
  return proxyToTjApi(request, { timeoutMs: 30_000 });
}
