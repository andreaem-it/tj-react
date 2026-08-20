import { NextRequest } from "next/server";
import { proxyPriceRadarToTjApi } from "@/lib/priceRadar/proxyTjApi";

export const dynamic = "force-dynamic";

/**
 * Avviso di prezzo (§24): registra/rimuove `{ endpoint, asin, targetPrice }`
 * lato tj-api, legato a una sottoscrizione push già attiva. Nessun segreto
 * qui: chi chiama è il browser del lettore, come `/api/push/subscribe`.
 */
export async function POST(request: NextRequest) {
  return proxyPriceRadarToTjApi(request, { admin: false });
}

export async function DELETE(request: NextRequest) {
  return proxyPriceRadarToTjApi(request, { admin: false });
}
