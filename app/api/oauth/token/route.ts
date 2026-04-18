import { NextResponse } from "next/server";

function notEnabled() {
  return NextResponse.json(
    {
      error: "temporarily_unavailable",
      error_description:
        "OAuth token endpoint is published for discovery but not enabled in this environment.",
    },
    { status: 503 }
  );
}

export async function POST() {
  return notEnabled();
}

export async function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
