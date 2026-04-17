import { NextResponse } from "next/server";

export async function GET() {
  const payload = {
    $schema: "https://agentskills.io/schema.json",
    skills: [
      {
        name: "price-radar",
        type: "api",
        description: "Retrieve product price trends and offers",
        url: "https://www.techjournal.it/api/price-radar",
        sha256: "placeholder",
      },
    ],
  };

  return NextResponse.json(payload, {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}
