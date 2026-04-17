import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";

export async function GET() {
  const base = SITE_URL.replace(/\/$/, "");

  const card = {
    protocolVersion: "0.2.0",
    name: "TechJournal Agent",
    description:
      "AI agent for news discovery, article search, and price-radar insights on TechJournal.",
    url: `${base}/.well-known/agent.json`,
    provider: {
      name: "TechJournal",
      url: base,
    },
    capabilities: {
      streaming: false,
      pushNotifications: false,
    },
    skills: [
      {
        id: "search-news",
        name: "Search News",
        description: "Search technology news and editorial content",
        endpoint: `${base}/search`,
      },
      {
        id: "price-radar",
        name: "Price Radar",
        description: "Retrieve monitored price trends and offers",
        endpoint: `${base}/api/price-radar/products`,
      },
    ],
  };

  return NextResponse.json(card, {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}
