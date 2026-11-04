import { proxyToTjApi } from "@/lib/tjApiProxy";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** Stesso-origin gateway: conserva il cookie HttpOnly pseudonimo sul dominio del sito. */
export function POST(request: NextRequest) {
  return proxyToTjApi(request);
}
