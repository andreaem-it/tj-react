import { NextRequest, NextResponse } from "next/server";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_ID = process.env.BREVO_LIST_ID;
const BREVO_API = "https://api.brevo.com/v3/contacts";

type BrevoErrorBody = { code?: string; message?: string };

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };
    const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!normalized || !normalized.includes("@")) {
      return NextResponse.json({ error: "Inserisci un indirizzo email valido." }, { status: 400 });
    }

    if (!BREVO_API_KEY?.trim() || !BREVO_LIST_ID?.trim()) {
      return NextResponse.json(
        { error: "Newsletter non configurata. Riprova più tardi." },
        { status: 503 }
      );
    }

    const listId = Number(BREVO_LIST_ID);
    if (!Number.isInteger(listId) || listId <= 0) {
      return NextResponse.json(
        { error: "Configurazione newsletter non valida." },
        { status: 503 }
      );
    }

    const res = await fetch(BREVO_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        "api-key": BREVO_API_KEY.trim(),
      },
      body: JSON.stringify({
        email: normalized,
        listIds: [listId],
        updateEnabled: true,
      }),
    });

    if (res.status === 201) {
      return NextResponse.json({ ok: true });
    }

    if (res.status === 400) {
      const body = (await res.json().catch(() => ({}))) as BrevoErrorBody;
      const code = body?.code ?? "";
      if (code === "duplicate_parameter") {
        return NextResponse.json({ ok: true });
      }
      if (code === "invalid_parameter" || code === "missing_parameter") {
        return NextResponse.json(
          { error: "Inserisci un indirizzo email valido." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: body?.message ?? "Richiesta non valida. Riprova." },
        { status: 400 }
      );
    }

    const errText = await res.text().catch(() => "");
    return NextResponse.json(
      { error: errText || "Errore durante l'iscrizione. Riprova più tardi." },
      { status: 502 }
    );
  } catch {
    return NextResponse.json(
      { error: "Errore di connessione. Riprova più tardi." },
      { status: 500 }
    );
  }
}

