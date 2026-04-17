import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";

export async function GET() {
  const base = SITE_URL.replace(/\/$/, "");
  const body = {
    linkset: [
      {
        anchor: `${base}/api`,
        "service-desc": `${base}/api/openapi.json`,
        "service-doc": `${base}/docs`,
        status: `${base}/api/status`,
      },
    ],
  };

  return NextResponse.json(body, {
    headers: {
      "content-type": "application/linkset+json; charset=utf-8",
    },
  });
}
