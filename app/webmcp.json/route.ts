import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";

export async function GET() {
  const base = SITE_URL.replace(/\/$/, "");

  const manifest = {
    version: "1.0",
    name: "TechJournal WebMCP",
    tools: [
      {
        name: "search-articles",
        description: "Search TechJournal articles by keyword",
        endpoint: `${base}/search`,
      },
      {
        name: "newsletter-subscribe",
        description: "Subscribe email to the TechJournal newsletter",
        endpoint: `${base}/api/newsletter`,
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
