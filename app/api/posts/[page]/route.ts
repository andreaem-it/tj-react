import { NextRequest } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/posts/:page?category=… → proxy verso tj-api (wordpress-content). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ page: string }> },
) {
  await params;
  return proxyToTjApi(request);
}
