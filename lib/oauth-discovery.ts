import { SITE_URL } from "@/lib/constants";

function baseUrl(): string {
  return SITE_URL.replace(/\/$/, "");
}

export function buildOAuthMetadata() {
  const base = baseUrl();
  return {
    issuer: base,
    authorization_endpoint: `${base}/api/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    jwks_uri: `${base}/api/oauth/jwks`,
    grant_types_supported: ["authorization_code", "client_credentials", "refresh_token"],
    response_types_supported: ["code"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    scopes_supported: ["openid", "profile", "email", "read:content"],
    code_challenge_methods_supported: ["S256"],
  };
}
