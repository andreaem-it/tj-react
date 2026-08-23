import { NextRequest, NextResponse } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const dynamic = "force-dynamic";

/**
 * Rimuove una sottoscrizione push. Corpo: `PushUnsubscribeBody`
 * (`lib/push/types.ts`) — solo `endpoint`.
 *
 * `POST`, non `DELETE`: alcuni service worker/browser non allegano un body
 * a `DELETE` in modo affidabile, e qui serve indicare *quale* sottoscrizione
 * rimuovere. tj-api deve esporre `POST /api/push/unsubscribe` e cancellare per
 * `endpoint`; un endpoint sconosciuto è un no-op (200), non un errore — il
 * browser può chiamarlo anche se la sottoscrizione lato server non esiste più.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.clone().json();
  } catch {
    return NextResponse.json({ error: "Payload JSON non valido" }, { status: 400 });
  }
  const endpointValue =
    typeof body === "object" && body !== null && "endpoint" in body
      ? (body as { endpoint?: unknown }).endpoint
      : null;
  let endpoint: URL;
  try {
    endpoint = new URL(typeof endpointValue === "string" ? endpointValue : "");
  } catch {
    return NextResponse.json({ error: "Endpoint push non valido" }, { status: 400 });
  }
  if (endpoint.protocol !== "https:") {
    return NextResponse.json({ error: "Endpoint push non valido" }, { status: 400 });
  }
  return proxyToTjApi(request, { timeoutMs: 15_000 });
}
