import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware disattivata sul traffico pubblico (matcher vuoto).
 * Le rewrite markdown per agenti sono su /api/markdown-article e /api/markdown-page.
 * Header di sicurezza solo in next.config.ts (senza Link multipli).
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
