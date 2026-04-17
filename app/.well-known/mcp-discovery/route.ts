import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";

export async function GET() {
  const base = SITE_URL.replace(/\/$/, "");
  const payload = {
    version: "1.0",
    discovery: `${base}/.well-known/mcp.json`,
    openapi: `${base}/api/openapi.json`,
    docs: `${base}/docs`,
  };

  return NextResponse.json(payload, {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}
