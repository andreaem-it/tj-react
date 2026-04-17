import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";

export async function GET() {
  const base = SITE_URL.replace(/\/$/, "");
  const manifest = {
    version: "1.0",
    name: "TechJournal WebMCP",
    description: "Declarative tools exposed by TechJournal web interface.",
    tools: [
      {
        name: "search-articles",
        description: "Search TechJournal articles by keyword",
        inputSchema: {
          type: "object",
          properties: {
            q: { type: "string", description: "Keyword to search in article titles and content" },
          },
          required: ["q"],
        },
        endpoint: `${base}/search`,
        method: "GET",
      },
      {
        name: "newsletter-subscribe",
        description: "Subscribe a user email to TechJournal newsletter updates",
        inputSchema: {
          type: "object",
          properties: {
            email: { type: "string", format: "email", description: "Email address to subscribe" },
          },
          required: ["email"],
        },
        endpoint: `${base}/api/newsletter`,
        method: "POST",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}
