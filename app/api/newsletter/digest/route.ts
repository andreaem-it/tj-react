import { NextRequest, NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";
import { isPriceRadarAdminRequest } from "@/lib/priceRadar/adminAuth";
import { DEFAULT_WINDOW_HOURS, loadDigest } from "@/lib/newsletter/loadDigest";
import { loadPriceDigest, MIN_PRICE_DIGEST_ITEMS } from "@/lib/newsletter/loadPriceDigest";
import {
  renderDigestHtml,
  renderDigestSubject,
  renderDigestText,
} from "@/lib/newsletter/render";
import {
  renderPriceDigestHtml,
  renderPriceDigestSubject,
  renderPriceDigestText,
} from "@/lib/newsletter/renderPriceDigest";

/**
 * Anteprima del digest della newsletter (§43-44).
 *
 * Compone la rassegna e restituisce oggetto, HTML e testo pronti per l'invio.
 * **Non spedisce**: l'integrazione con il servizio di posta (Brevo) vive in
 * tj-api, dove stanno le credenziali, e questo endpoint è la sorgente del
 * contenuto — non il mittente. Separare le due cose è anche ciò che rende
 * possibile la revisione prima dell'invio richiesta dal progetto.
 *
 * `?kind=price-radar-weekly` compone "Price Radar Weekly" invece del digest
 * quotidiano di articoli: stesso endpoint, stesso pattern di anteprima,
 * sorgente dati e rendering completamente separati (`loadPriceDigest.ts`,
 * `renderPriceDigest.ts`) perché la forma del contenuto non ha nulla in
 * comune con un articolo (niente finestra temporale da filtrare, un prodotto
 * al minimo storico resta valido per giorni).
 *
 * ## Autenticazione
 *
 * Riusa `PRICE_RADAR_ADMIN_SECRET`, il segreto già condiviso con il pannello
 * amministrativo. Il nome porta le tracce del primo uso, ma introdurre una
 * seconda variabile per lo stesso interlocutore significherebbe una env in più
 * da configurare e da tenere allineata, per nessun guadagno di sicurezza.
 *
 * L'anteprima è protetta anche se il contenuto è pubblico: mostra *cosa
 * spediremmo*, che è una decisione editoriale non ancora presa.
 */
export const dynamic = "force-dynamic";

/** Limiti dei parametri di anteprima: una settimana è il massimo sensato. */
const MAX_WINDOW_HOURS = 24 * 7;
const MAX_ITEMS = 12;

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export async function GET(request: NextRequest) {
  if (!isPriceRadarAdminRequest(request)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const options = {
    siteUrl: SITE_URL,
    /**
     * Segnaposto: l'URL vero è per destinatario e lo genera il servizio d'invio.
     * Resta visibile nell'anteprima perché un digest senza disiscrizione non è
     * spedibile, e chi rivede deve vedere che il posto c'è.
     */
    unsubscribeUrl: `${SITE_URL.replace(/\/$/, "")}/privacy#newsletter`,
  };

  if (params.get("kind") === "price-radar-weekly") {
    const maxItems = clampInt(params.get("items"), 8, 3, MAX_ITEMS);
    const { digest, examined } = await loadPriceDigest({ maxItems });

    if (!digest) {
      return NextResponse.json(
        {
          digest: null,
          examined,
          reason: `Meno di ${MIN_PRICE_DIGEST_ITEMS} occasioni verificate oggi: troppo poco per giustificare un invio.`,
        },
        { status: 200 },
      );
    }

    if (params.get("format") === "html") {
      return new NextResponse(renderPriceDigestHtml(digest, options), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return NextResponse.json({
      subject: renderPriceDigestSubject(digest),
      html: renderPriceDigestHtml(digest, options),
      text: renderPriceDigestText(digest, options),
      digest,
      examined,
    });
  }

  const windowHours = clampInt(params.get("hours"), DEFAULT_WINDOW_HOURS, 1, MAX_WINDOW_HOURS);
  const maxItems = clampInt(params.get("items"), 8, 3, MAX_ITEMS);

  const { digest, examined, upstreamFailed } = await loadDigest({ windowHours, maxItems });

  if (!digest) {
    return NextResponse.json(
      {
        digest: null,
        examined,
        upstreamFailed,
        reason: upstreamFailed
          ? "La sorgente articoli non ha risposto: riprovare, non spedire."
          : "Troppe poche notizie nella finestra per giustificare un invio.",
      },
      { status: 200 },
    );
  }

  if (params.get("format") === "html") {
    return new NextResponse(renderDigestHtml(digest, options), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.json({
    subject: renderDigestSubject(digest),
    html: renderDigestHtml(digest, options),
    text: renderDigestText(digest, options),
    digest,
    examined,
  });
}
