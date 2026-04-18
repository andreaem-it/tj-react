import { NextResponse } from "next/server";

/**
 * JWKS placeholder endpoint for OAuth/OIDC discovery.
 * Keys array is intentionally empty until signing keys are provisioned.
 */
export async function GET() {
  return NextResponse.json(
    {
      keys: [],
    },
    {
      headers: { "content-type": "application/jwk-set+json; charset=utf-8" },
    }
  );
}
