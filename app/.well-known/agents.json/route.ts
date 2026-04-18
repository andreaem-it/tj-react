import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";

export async function GET() {
  const base = SITE_URL.replace(/\/$/, "");
  return NextResponse.json(
    {
      agents: [
        {
          id: "techjournal-agent",
          name: "TechJournal Agent",
          url: `${base}/.well-known/agent.json`,
        },
      ],
    },
    {
      headers: { "content-type": "application/json; charset=utf-8" },
    }
  );
}
