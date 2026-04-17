import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";

export async function GET() {
  const base = SITE_URL.replace(/\/$/, "");

  const descriptor = {
    name: "TechJournal API",
    description: "Entry point for TechJournal API discovery.",
    serviceDesc: `${base}/api/openapi.json`,
    serviceDoc: `${base}/docs`,
    status: `${base}/api/status`,
  };

  return NextResponse.json(descriptor, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      Link: `</api/openapi.json>; rel="service-desc", </docs>; rel="service-doc"`,
    },
  });
}
