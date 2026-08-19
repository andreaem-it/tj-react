import { NextRequest } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const dynamic = "force-dynamic";

/**
 * Salva una sottoscrizione push. Corpo: vedi `PushSubscribeBody`
 * (`lib/push/types.ts`). Nessun segreto qui: chi chiama è il browser del
 * lettore, non un pannello admin — stesso schema di `/api/newsletter`.
 *
 * tj-api deve esporre lo stesso path (`POST /api/push/subscribe`) e fare
 * upsert per `endpoint`, non insert cieco: un browser che riattiva le
 * notifiche rimanda la stessa sottoscrizione più volte.
 */
export async function POST(request: NextRequest) {
  return proxyToTjApi(request, { timeoutMs: 15_000 });
}
