import { NextRequest, NextResponse } from "next/server";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_ID = process.env.BREVO_LIST_ID;

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Email non valida." }, { status: 400 });
    }

    if (!BREVO_API_KEY || !BREVO_LIST_ID) {
      return NextResponse.json(
        { error: "Newsletter non configurata lato server." },
        { status: 500 }
      );
    }

    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        email,
        listIds: [Number(BREVO_LIST_ID)],
        updateEnabled: true,
      }),
    });

    // 201: created, 204: updated, 400: già iscritto o errore validazione.
    if (res.ok || res.status === 400) {
      return NextResponse.json({ ok: true });
    }

    const error = await res.text().catch(() => "");
    return NextResponse.json(
      { error: error || "Errore durante l'iscrizione alla newsletter." },
      { status: 502 }
    );
  } catch {
    return NextResponse.json(
      { error: "Errore imprevisto durante l'iscrizione." },
      { status: 500 }
    );
  }
}

