import { NextRequest } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return proxyToTjApi(request);
}
