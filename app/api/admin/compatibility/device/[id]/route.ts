import type { NextRequest } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export async function PATCH(request: NextRequest) {
  return proxyToTjApi(request);
}

export async function DELETE(request: NextRequest) {
  return proxyToTjApi(request);
}
