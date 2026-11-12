import type { NextRequest } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const dynamic = "force-dynamic";

export function POST(request: NextRequest) {
  return proxyToTjApi(request, { timeoutMs: 5_000 });
}
