import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";

export async function GET() {
  const base = SITE_URL.replace(/\/$/, "");
  const content = [
    "# TechJournal (techjournal.it) - LLM Access Guide",
    "",
    `Site: ${base}`,
    "Type: Italian technology news website",
    "Primary language: it-IT",
    "",
    "## Canonical discovery",
    `- Sitemap: ${base}/sitemap.xml`,
    `- Robots: ${base}/robots.txt`,
    `- Feed: ${base}/feed.xml`,
    "",
    "## Machine-readable endpoints",
    `- API catalog: ${base}/.well-known/api-catalog`,
    `- Agent skills: ${base}/.well-known/agent-skills/index.json`,
    `- Agent card: ${base}/.well-known/agent.json`,
    `- API status: ${base}/api/status`,
  ].join("\n");

  return new NextResponse(content, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
