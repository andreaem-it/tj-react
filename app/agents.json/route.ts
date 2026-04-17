import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";

export async function GET() {
  const base = SITE_URL.replace(/\/$/, "");

  const payload = {
    agents: [
      {
        id: "techjournal-agent",
        name: "TechJournal Agent",
        description: "Agent metadata for TechJournal content and APIs.",
        url: `${base}/.well-known/agent.json`,
      },
    ],
    catalogs: [
      `${base}/.well-known/api-catalog`,
      `${base}/.well-known/agent-skills/index.json`,
    ],
  };

  return NextResponse.json(payload, {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}
