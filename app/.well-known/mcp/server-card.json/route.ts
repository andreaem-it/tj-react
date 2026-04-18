import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";

export async function GET() {
  const base = SITE_URL.replace(/\/$/, "");

  const serverCard = {
    schemaVersion: "2025-06-18",
    serverInfo: {
      name: "TechJournal MCP Server",
      version: "1.0.0",
      description: "MCP discovery surface for TechJournal APIs and editorial resources.",
      websiteUrl: base,
    },
    transports: [
      {
        type: "http",
        endpoint: `${base}/api`,
      },
    ],
    capabilities: {
      tools: true,
      resources: true,
      prompts: false,
      logging: false,
    },
    links: {
      discovery: `${base}/.well-known/mcp.json`,
      openapi: `${base}/api/openapi.json`,
      docs: `${base}/docs`,
      status: `${base}/api/status`,
    },
  };

  return NextResponse.json(serverCard, {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
