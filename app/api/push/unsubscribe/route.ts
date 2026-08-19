import { NextRequest } from "next/server";
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
  return proxyToTjApi(request, { timeoutMs: 15_000 });
}
