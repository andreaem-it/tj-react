import { NextResponse } from "next/server";
import { buildOAuthMetadata } from "@/lib/oauth-discovery";

export async function GET() {
  return NextResponse.json(buildOAuthMetadata(), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
