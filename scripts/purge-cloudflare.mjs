#!/usr/bin/env node
/**
 * Purge Cloudflare one-off per path arbitrari.
 *
 * `purgeCloudflare()` in lib/cacheInvalidation.ts copre solo la pubblicazione
 * di un articolo, e solo i path che ne derivano (`/`, `/{categoria}`,
 * `/{categoria}/{slug}`). Non esiste quindi alcun modo di ripulire un URL che
 * la CDN ha cachato ma che il webhook non nominerà mai — tipicamente gli URL
 * WordPress legacy (`/home`, `/tag/*`, `/ios/19`), rimasti in cache come 200
 * dopo il fix dei soft-404.
 *
 * Uso:
 *   CLOUDFLARE_ZONE_ID=… CLOUDFLARE_PURGE_TOKEN=… \
 *     node scripts/purge-cloudflare.mjs /home /tag/audio /ios/19
 *
 * Oppure leggendo le credenziali da un file env già scaricato:
 *   node --env-file=.env.local scripts/purge-cloudflare.mjs /home
 *
 * Le credenziali si passano solo via ambiente: mai come argomento, che
 * finirebbe nella lista processi e nella history della shell.
 */

const CLOUDFLARE_API = "https://api.cloudflare.com/client/v4";
/** Cloudflare accetta al massimo 30 URL per chiamata di purge. */
const MAX_FILES_PER_CALL = 30;
const TIMEOUT_MS = 15_000;

const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
const token = process.env.CLOUDFLARE_PURGE_TOKEN?.trim();
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.techjournal.it").replace(
  /\/$/,
  "",
);

if (!zoneId || !token) {
  console.error(
    "Mancano CLOUDFLARE_ZONE_ID e/o CLOUDFLARE_PURGE_TOKEN nell'ambiente.\n" +
      "Sono già impostate su Vercel (Production), ma `vercel env pull` le restituisce\n" +
      "come [SENSITIVE]: vanno riprese dalla dashboard Cloudflare o dal proprio gestore\n" +
      "di segreti e passate a questo comando via ambiente.",
  );
  process.exit(1);
}

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error("Nessun path indicato. Esempio: node scripts/purge-cloudflare.mjs /home /tag/audio");
  process.exit(1);
}

const invalid = paths.filter((p) => !p.startsWith("/"));
if (invalid.length > 0) {
  console.error(`I path devono iniziare con "/": ${invalid.join(", ")}`);
  process.exit(1);
}

const files = paths.map((p) => `${siteUrl}${p}`);

/** Un purge parziale è comunque utile: si continua e si riporta il totale. */
async function purgeChunk(chunk) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${CLOUDFLARE_API}/zones/${zoneId}/purge_cache`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files: chunk }),
      signal: controller.signal,
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || body?.success === false) {
      // I messaggi di Cloudflare non contengono il token, ma sì il motivo
      // (permesso mancante, zona sbagliata): sono la parte utile da mostrare.
      const detail = body?.errors?.map((e) => `${e.code} ${e.message}`).join("; ");
      return { ok: false, reason: detail || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return { ok: false, reason: aborted ? "timeout" : `errore di rete: ${e.message}` };
  } finally {
    clearTimeout(timer);
  }
}

let purged = 0;
let failed = 0;
for (let i = 0; i < files.length; i += MAX_FILES_PER_CALL) {
  const chunk = files.slice(i, i + MAX_FILES_PER_CALL);
  const outcome = await purgeChunk(chunk);
  if (outcome.ok) {
    purged += chunk.length;
    for (const f of chunk) console.log(`  purgato  ${f}`);
  } else {
    failed += chunk.length;
    console.error(`  FALLITO  (${chunk.length} URL): ${outcome.reason}`);
  }
}

console.log(`\n${purged} URL purgati, ${failed} falliti.`);
if (failed > 0) process.exit(1);
