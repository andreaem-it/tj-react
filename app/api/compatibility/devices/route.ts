import { NextResponse, type NextRequest } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  if (type && !["iphone", "ipad", "mac"].includes(type)) {
    return NextResponse.json({ error: "Invalid device type" }, { status: 400 });
  }
  return proxyToTjApi(request);
}
