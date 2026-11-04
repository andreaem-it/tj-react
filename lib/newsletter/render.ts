import { escapeHtmlAttribute } from "@/lib/content/text";
import type { Digest } from "@/lib/newsletter/digest";

/**
 * Rendering del digest in HTML per email e in testo semplice.
 *
 * Modulo puro. Nessuna libreria di template: una email è una tabella con stili
 * inline, e i client di posta ignorano `<style>`, le classi, flexbox e grid. Le
 * scelte apparentemente antiquate qui sono le uniche che funzionano su Outlook e
 * Gmail insieme.
 *
 * La versione testuale non è un extra: un invio con solo HTML peggiora la
 * consegnabilità e resta illeggibile per chi disattiva le immagini o legge da
 * terminale.
 */

export interface RenderDigestOptions {
  /** URL assoluto del sito, senza slash finale. */
  siteUrl: string;
  /**
   * URL di disiscrizione.
   *
   * Parametro obbligatorio e non un valore fisso perché lo genera il servizio
   * d'invio, per destinatario. Un digest commerciale senza disiscrizione non è
   * spedibile: è un requisito di legge, non una cortesia, e per questo il
   * renderer non ha un valore predefinito da usare per sbaglio.
   */
  unsubscribeUrl: string;
  /** URL per revocare solo il tracciamento di aperture e clic. */
  trackingOptOutUrl?: string;
  /** Testo del titolo mostrato in testa. */
  title?: string;
}

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatPeriod(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  });
}

export function renderDigestSubject(digest: Digest): string {
  const lead = digest.items[0];
  const date = formatPeriod(digest.periodEnd);
  // L'oggetto porta la notizia principale e non un'etichetta generica: è l'unica
  // cosa che il destinatario legge prima di decidere se aprire.
  return lead ? `${lead.post.title} · TechJournal del ${date}` : `TechJournal del ${date}`;
}

export function renderDigestHtml(digest: Digest, options: RenderDigestOptions): string {
  const { siteUrl, unsubscribeUrl, trackingOptOutUrl } = options;
  const base = siteUrl.replace(/\/$/, "");
  const title = options.title ?? "Le notizie di oggi";

  const rows = digest.items
    .map((item, index) => {
      const url = `${base}${item.path}`;
      const eyebrow = item.topic?.name ?? item.post.categoryName;
      if (index === 0) {
        return `
      <tr>
        <td style="padding:0 0 34px 0;font-family:${FONT};">
          ${item.post.imageUrl ? `<a href="${escapeHtmlAttribute(url)}" style="display:block;"><img src="${escapeHtmlAttribute(item.post.imageUrl)}" alt="${escapeHtmlAttribute(item.post.imageAlt || "")}" width="544" style="display:block;width:100%;max-width:544px;height:auto;border:0;border-radius:10px 10px 0 0;"></a>` : ""}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#171717;border-radius:${item.post.imageUrl ? "0 0 10px 10px" : "10px"};">
            <tr><td style="padding:26px 26px 28px 26px;font-family:${FONT};">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#f5a623;padding-bottom:10px;font-weight:800;">${escapeText(eyebrow)}</div>
              <a href="${escapeHtmlAttribute(url)}" style="font-size:27px;line-height:1.16;font-weight:800;letter-spacing:-.02em;color:#ffffff;text-decoration:none;">${escapeText(item.post.title)}</a>
              <div style="font-size:15px;line-height:1.65;color:#d1d5db;padding-top:13px;">${escapeText(item.blurb)}</div>
              <div style="padding-top:20px;"><a href="${escapeHtmlAttribute(url)}" style="display:inline-block;background:#f5a623;color:#2b1900;text-decoration:none;font-size:13px;font-weight:800;padding:11px 16px;border-radius:6px;">Leggi la storia &rarr;</a></div>
            </td></tr>
          </table>
        </td>
      </tr>`;
      }
      return `
      <tr>
        <td style="padding:0 0 18px 0;font-family:${FONT};border-bottom:1px solid #e5e7eb;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              ${item.post.imageUrl ? `<td width="112" valign="middle" style="width:112px;padding:18px 16px 0 0;"><a href="${escapeHtmlAttribute(url)}" style="display:block;"><img src="${escapeHtmlAttribute(item.post.imageUrl)}" alt="${escapeHtmlAttribute(item.post.imageAlt || "")}" width="112" style="display:block;width:100%;max-width:112px;height:auto;border:0;border-radius:8px;"></a></td>` : ""}
              <td valign="middle" style="padding:18px 0 0 0;font-family:${FONT};">
                <a href="${escapeHtmlAttribute(url)}" style="font-size:19px;line-height:1.34;font-weight:750;color:#111827;text-decoration:none;">${escapeText(item.post.title)}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join("");

  // `role="presentation"` sulle tabelle di layout: senza, gli screen reader le
  // annunciano come tabelle di dati e leggono righe e colonne inesistenti.
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeText(renderDigestSubject(digest))}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Le storie tech che contano, scelte dalla redazione di TechJournal.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(17,24,39,.08);">
        <tr>
          <td style="padding:26px 28px 24px 28px;font-family:${FONT};border-top:5px solid #f5a623;">
            <a href="${escapeHtmlAttribute(base)}" style="display:inline-block;text-decoration:none;"><img src="${escapeHtmlAttribute(`${base}/techjournal-logo-grey.png`)}" alt="TechJournal" width="220" style="display:block;width:220px;max-width:100%;height:auto;border:0;"></a>
            <div style="font-size:13px;color:#6b7280;padding-top:8px;">${escapeText(title)} &nbsp;•&nbsp; ${escapeText(formatPeriod(digest.periodEnd))}</div>
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.45;color:#1f2937;padding-top:22px;">Buongiorno. Mettiti comodo: abbiamo scelto le storie tech che vale davvero la pena conoscere oggi.</div>
          </td>
        </tr>
        <tr><td style="padding:10px 28px 0 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
        <tr>
          <td style="padding:6px 28px 30px 28px;font-family:${FONT};">
            <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#111827;padding-top:16px;">Continua su TechJournal</div>
            <div style="font-size:13px;color:#6b7280;padding-top:10px;">
              <a href="${escapeHtmlAttribute(`${base}/price-radar`)}" style="color:#925800;text-decoration:none;">Price Radar</a>
              &nbsp;·&nbsp;
              <a href="${escapeHtmlAttribute(`${base}/compatibility`)}" style="color:#925800;text-decoration:none;">Compatibilità Apple</a>
              &nbsp;·&nbsp;
              <a href="${escapeHtmlAttribute(`${base}/topic`)}" style="color:#925800;text-decoration:none;">Argomenti</a>
            </div>
            <div style="font-size:11px;color:#9ca3af;padding-top:14px;line-height:1.5;">
              Ricevi questa email perché ti sei iscritto alla newsletter di TechJournal.
              Le email possono contenere pixel e link personalizzati solo in base alla preferenza di consenso registrata.
              <a href="${escapeHtmlAttribute(`${base}/privacy#newsletter`)}" style="color:#9ca3af;">Informativa newsletter e pixel</a>.
              <a href="${escapeHtmlAttribute(unsubscribeUrl)}" style="color:#9ca3af;">Disiscriviti</a>.
              ${trackingOptOutUrl ? `<a href="${escapeHtmlAttribute(trackingOptOutUrl)}" style="color:#9ca3af;">Disattiva il tracciamento di aperture e clic</a>, continuando a ricevere la newsletter.` : ""}
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function renderDigestText(digest: Digest, options: RenderDigestOptions): string {
  const base = options.siteUrl.replace(/\/$/, "");
  const lines: string[] = [
    `TechJournal · ${formatPeriod(digest.periodEnd)}`,
    "",
  ];

  for (const item of digest.items) {
    lines.push((item.topic?.name ?? item.post.categoryName).toUpperCase());
    lines.push(item.post.title);
    if (item.blurb) lines.push(item.blurb);
    lines.push(`${base}${item.path}`);
    lines.push("");
  }

  lines.push("---");
  lines.push(`Price Radar: ${base}/price-radar`);
  lines.push(`Compatibilità Apple: ${base}/compatibility`);
  lines.push("");
  lines.push(`Informativa newsletter e pixel: ${base}/privacy#newsletter`);
  lines.push(`Disiscriviti: ${options.unsubscribeUrl}`);
  if (options.trackingOptOutUrl) {
    lines.push(`Disattiva il tracciamento di aperture e clic: ${options.trackingOptOutUrl}`);
  }

  return lines.join("\n");
}
