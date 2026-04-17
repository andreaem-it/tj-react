import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";

export async function GET() {
  const base = SITE_URL.replace(/\/$/, "");

  const discovery = {
    mcpVersion: "1.0",
    name: "TechJournal MCP Discovery",
    servers: [
      {
        id: "techjournal-http-api",
        transport: "https",
        url: `${base}/api`,
        description: "HTTP API surface for TechJournal integrations",
      },
    ],
    links: {
      openapi: `${base}/api/openapi.json`,
      docs: `${base}/docs`,
      status: `${base}/api/status`,
      apiCatalog: `${base}/.well-known/api-catalog`,
    },
  };

  return NextResponse.json(discovery, {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}
