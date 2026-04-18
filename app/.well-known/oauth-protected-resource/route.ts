import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";

export async function GET() {
  const base = SITE_URL.replace(/\/$/, "");

  const metadata = {
    resource: `${base}/api`,
    authorization_servers: [base],
    scopes_supported: ["openid", "profile", "email", "read:content"],
  };

  return NextResponse.json(metadata, {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
