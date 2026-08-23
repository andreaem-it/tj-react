import { NextResponse, type NextRequest } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!/^[a-z0-9](?:[a-z0-9-]{0,198}[a-z0-9])?$/.test(slug)) {
    return NextResponse.json(
      { error: "Invalid OS slug" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const status = request.nextUrl.searchParams.get("status");
  if (status && !["supported", "unsupported", "partial", "community"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid compatibility status" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  return proxyToTjApi(request);
}
