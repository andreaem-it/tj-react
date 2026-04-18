import { NextResponse } from "next/server";
import { buildOAuthMetadata } from "@/lib/oauth-discovery";

export async function GET() {
  const oauth = buildOAuthMetadata();
  const openid = {
    ...oauth,
    id_token_signing_alg_values_supported: ["RS256"],
    subject_types_supported: ["public"],
    claims_supported: ["sub", "iss", "aud", "exp", "iat", "name", "email"],
  };

  return NextResponse.json(openid, {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
