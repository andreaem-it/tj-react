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
  const { siteUrl, unsubscribeUrl } = options;
  const base = siteUrl.replace(/\/$/, "");
  const title = options.title ?? "Le notizie di oggi";

  const rows = digest.items
    .map((item) => {
      const url = `${base}${item.path}`;
      const eyebrow = item.topic?.name ?? item.post.categoryName;
      return `
      <tr>
        <td style="padding:0 0 28px 0;font-family:${FONT};">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;padding-bottom:6px;">${escapeText(eyebrow)}</div>
          <a href="${escapeHtmlAttribute(url)}" style="font-size:18px;line-height:1.35;font-weight:700;color:#111827;text-decoration:none;">${escapeText(item.post.title)}</a>
          <div style="font-size:14px;line-height:1.55;color:#4b5563;padding-top:8px;">${escapeText(item.blurb)}</div>
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
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;">
        <tr>
          <td style="padding:28px 28px 8px 28px;font-family:${FONT};">
            <a href="${escapeHtmlAttribute(base)}" style="font-size:20px;font-weight:800;color:#111827;text-decoration:none;">TechJournal</a>
            <div style="font-size:13px;color:#6b7280;padding-top:4px;">${escapeText(title)} · ${escapeText(formatPeriod(digest.periodEnd))}</div>
          </td>
        </tr>
        <tr><td style="padding:20px 28px 0 28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
        <tr>
          <td style="padding:8px 28px 28px 28px;font-family:${FONT};border-top:1px solid #e5e7eb;">
            <div style="font-size:13px;color:#6b7280;padding-top:16px;">
              <a href="${escapeHtmlAttribute(`${base}/price-radar`)}" style="color:#925800;text-decoration:none;">Price Radar</a>
              &nbsp;·&nbsp;
              <a href="${escapeHtmlAttribute(`${base}/compatibility`)}" style="color:#925800;text-decoration:none;">Compatibilità Apple</a>
              &nbsp;·&nbsp;
              <a href="${escapeHtmlAttribute(`${base}/topic`)}" style="color:#925800;text-decoration:none;">Argomenti</a>
            </div>
            <div style="font-size:11px;color:#9ca3af;padding-top:14px;line-height:1.5;">
              Ricevi questa email perché ti sei iscritto alla newsletter di TechJournal.
              <a href="${escapeHtmlAttribute(unsubscribeUrl)}" style="color:#9ca3af;">Disiscriviti</a>.
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
  lines.push(`Disiscriviti: ${options.unsubscribeUrl}`);

  return lines.join("\n");
}
