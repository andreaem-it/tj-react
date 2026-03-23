import { NextRequest, NextResponse } from "next/server";
import {
  verifyAdminPassword,
  createSession,
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const hasUser = Boolean(process.env.ADMIN_USER?.trim());
    const hasHash =
      Boolean(process.env.ADMIN_PASSWORD_HASH?.trim()) ||
      Boolean(process.env.ADMIN_PASSWORD_HASH_B64?.trim());
    if (process.env.NODE_ENV !== "production") {
      console.log("[auth/login] ADMIN_USER presente:", hasUser, "| Hash (ADMIN_PASSWORD_HASH o _B64) presente:", hasHash);
    }
    if (!hasUser || !hasHash) {
      return NextResponse.json(
        { error: "Configurazione mancante: imposta ADMIN_USER e ADMIN_PASSWORD_HASH in .env.local" },
        { status: 500 }
      );
    }
    if (!process.env.AUTH_SECRET?.trim() || process.env.AUTH_SECRET.trim().length < 32) {
      return NextResponse.json(
        { error: "Configurazione mancante: imposta AUTH_SECRET (min 32 caratteri) in .env.local" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username e password richiesti" },
        { status: 400 }
      );
    }

    const result = await verifyAdminPassword(username, password);
    if (!result.valid) {
      const isDev = process.env.NODE_ENV !== "production";
      const message = isDev
        ? result.reason === "user"
          ? "Username non riconosciuto (verifica ADMIN_USER in .env.local)"
          : "Password non corretta (rigenera l'hash con: node -e \"require('bcryptjs').hash('TUA_PASSWORD', 10).then(h=>console.log(h))\" e aggiorna ADMIN_PASSWORD_HASH)"
        : "Credenziali non valide";
      return NextResponse.json(
        { error: message },
        { status: 401 }
      );
    }

    const token = await createSession(username);
    const res = NextResponse.json({ success: true }, { status: 200 });
    const opts = getSessionCookieOptions();
    res.cookies.set(getSessionCookieName(), token, opts);
    return res;
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json(
      { error: "Errore durante il login" },
      { status: 500 }
    );
  }
}
