import { NextResponse, type NextRequest } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!/^[a-z0-9](?:[a-z0-9-]{0,198}[a-z0-9])?$/.test(slug)) {
    return NextResponse.json({ error: "Invalid OS slug" }, { status: 400 });
  }
  return proxyToTjApi(request);
}
