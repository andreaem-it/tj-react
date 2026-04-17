import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";

export async function GET() {
  const base = SITE_URL.replace(/\/$/, "");
  return NextResponse.json(
    {
      version: "1.0",
      manifest: `${base}/.well-known/webmcp.json`,
      tools: ["search-articles", "newsletter-subscribe"],
    },
    {
      headers: { "content-type": "application/json; charset=utf-8" },
    }
  );
}
