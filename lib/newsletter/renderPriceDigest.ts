import { escapeHtmlAttribute } from "@/lib/content/text";
import { describePriceRating, formatEuro, PRICE_LEVEL_LABEL } from "@/lib/priceRadar/rating";
import type { PriceDigest } from "@/lib/newsletter/priceDigest";
import type { RenderDigestOptions } from "@/lib/newsletter/render";

/**
 * Rendering di "Price Radar Weekly" (§43-44). Stesso approccio del digest
 * quotidiano (`render.ts`): tabelle con stili inline, niente CSS esterno —
 * è l'unico modo che funziona su Outlook e Gmail insieme.
 *
 * Il testo per prodotto è `describePriceRating`, lo stesso usato in pagina:
 * non esiste una seconda copia scritta apposta per l'email che potrebbe
 * divergere da quanto il lettore vede cliccando.
 */

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

export function renderPriceDigestSubject(digest: PriceDigest): string {
  const lead = digest.items[0];
  const date = formatPeriod(digest.periodEnd);
  const title = lead?.product.title?.trim();
  return title
    ? `${title} e altre occasioni · Price Radar Weekly del ${date}`
    : `Price Radar Weekly del ${date}`;
}

export function renderPriceDigestHtml(digest: PriceDigest, options: RenderDigestOptions): string {
  const { siteUrl, unsubscribeUrl } = options;
  const base = siteUrl.replace(/\/$/, "");
  const title = options.title ?? "Le occasioni della settimana";

  const rows = digest.items
    .map((entry) => {
      const { product, rating, stats } = entry;
      if (product.current_price == null) return "";
      const url = `${base}/price-radar/${product.asin}`;
      const productTitle = product.title?.trim() || "Prodotto monitorato";
      const description = describePriceRating(rating, stats, product.currency || "EUR");
      const levelLabel = rating.level ? PRICE_LEVEL_LABEL[rating.level] : null;
      return `
      <tr>
        <td style="padding:0 0 28px 0;font-family:${FONT};">
          ${
            product.image_url
              ? `<a href="${escapeHtmlAttribute(url)}" style="display:block;padding-bottom:10px;"><img src="${escapeHtmlAttribute(product.image_url)}" alt="" width="80" style="max-width:80px;height:auto;border:0;"></a>`
              : ""
          }
          ${levelLabel ? `<div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#925800;padding-bottom:6px;font-weight:700;">${escapeText(levelLabel)}</div>` : ""}
          <a href="${escapeHtmlAttribute(url)}" style="font-size:18px;line-height:1.35;font-weight:700;color:#111827;text-decoration:none;">${escapeText(productTitle)}</a>
          <div style="font-size:16px;font-weight:700;color:#111827;padding-top:6px;">${escapeText(formatEuro(product.current_price, product.currency || "EUR"))}</div>
          ${description ? `<div style="font-size:14px;line-height:1.55;color:#4b5563;padding-top:6px;">${escapeText(description)}</div>` : ""}
        </td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeText(renderPriceDigestSubject(digest))}</title>
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
              <a href="${escapeHtmlAttribute(`${base}/price-radar`)}" style="color:#925800;text-decoration:none;">Tutte le occasioni</a>
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

export function renderPriceDigestText(digest: PriceDigest, options: RenderDigestOptions): string {
  const base = options.siteUrl.replace(/\/$/, "");
  const lines: string[] = [
    `TechJournal · Price Radar Weekly · ${formatPeriod(digest.periodEnd)}`,
    "",
  ];

  for (const entry of digest.items) {
    const { product, rating, stats } = entry;
    if (product.current_price == null) continue;
    const levelLabel = rating.level ? PRICE_LEVEL_LABEL[rating.level] : null;
    if (levelLabel) lines.push(levelLabel.toUpperCase());
    lines.push(product.title?.trim() || "Prodotto monitorato");
    lines.push(formatEuro(product.current_price, product.currency || "EUR"));
    const description = describePriceRating(rating, stats, product.currency || "EUR");
    if (description) lines.push(description);
    lines.push(`${base}/price-radar/${product.asin}`);
    lines.push("");
  }

  lines.push("---");
  lines.push(`Tutte le occasioni: ${base}/price-radar`);
  lines.push("");
  lines.push(`Disiscriviti: ${options.unsubscribeUrl}`);

  return lines.join("\n");
}
