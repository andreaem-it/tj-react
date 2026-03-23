/**
 * Ottiene un refresh token OAuth per AdSense (scope readonly).
 *
 * Prerequisiti in Google Cloud (stesso progetto dove abiliti AdSense Management API):
 * - Credenziali OAuth → tipo "App desktop" (consigliato) o "Web" con redirect sotto.
 * - Schermata di consenso OAuth: se lo stato è "In fase di test", aggiungi come
 *   **Utenti di test** l’email con cui apri il browser (deve coincidere con l’accesso AdSense).
 *   Senza questo, Google risponde access_denied (403).
 *
 * Uso:
 *   export ADSENSE_OAUTH_CLIENT_ID=...
 *   export ADSENSE_OAUTH_CLIENT_SECRET=...
 *   npm run adsense-oauth
 *
 * Redirect (solo client OAuth di tipo "Applicazione web"):
 *   http://127.0.0.1:34567/oauth2callback
 *
 * Non committare mai ID/secret in questo file: usa solo export o .env.local (non in git).
 */

import { OAuth2Client } from "google-auth-library";
import http from "http";
import { URL } from "url";

const PORT = 34567;
const SCOPE = "https://www.googleapis.com/auth/adsense.readonly";

const clientId = process.env.ADSENSE_OAUTH_CLIENT_ID?.trim();
const clientSecret = process.env.ADSENSE_OAUTH_CLIENT_SECRET?.trim();

if (!clientId || !clientSecret) {
  console.error(
    "Imposta ADSENSE_OAUTH_CLIENT_ID e ADSENSE_OAUTH_CLIENT_SECRET (es. export …) e rilancia npm run adsense-oauth."
  );
  process.exit(1);
}

const redirectUri = `http://127.0.0.1:${PORT}/oauth2callback`;
const client = new OAuth2Client(clientId, clientSecret, redirectUri);

const authUrl = client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [SCOPE],
});

function accessDeniedHelpHtml(errDesc) {
  const desc = errDesc ? `<p class="muted">${escapeHtml(errDesc)}</p>` : "";
  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"/><title>access_denied</title>
<style>body{font-family:system-ui,sans-serif;max-width:42rem;margin:2rem;line-height:1.5}
code{background:#eee;padding:2px 6px;border-radius:4px}.muted{color:#555}</style></head><body>
<h1>access_denied</h1>
<p>Google ha rifiutato il consenso. Le cause più comuni:</p>
<ul>
<li><strong>App in test:</strong> Google Cloud → API e servizi → <strong>Schermata di consenso OAuth</strong> → se lo stato è <em>In fase di test</em>, aggiungi nella sezione <strong>Utenti di test</strong> l’indirizzo email <strong>esatto</strong> con cui hai fatto login nel browser (es. info@techjournal.it), salva e riprova.</li>
<li><strong>Account sbagliato:</strong> usa l’Account Google che ha accesso <em>Attivo</em> ad AdSense, non il service account.</li>
<li><strong>Organizzazione Google Workspace:</strong> l’amministratore può bloccare app non approvate.</li>
<li><strong>Hai cliccato Annulla</strong> sulla schermata di consenso.</li>
</ul>
${desc}
<p>Rigenera il flusso dal terminale con <code>npm run adsense-oauth</code>.</p>
</body></html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
    if (u.pathname !== "/oauth2callback") {
      res.writeHead(404);
      res.end();
      return;
    }
    const code = u.searchParams.get("code");
    const err = u.searchParams.get("error");
    const errDesc = u.searchParams.get("error_description") || "";
    if (err) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      if (err === "access_denied") {
        console.error("\n[OAuth] access_denied — Se l’app OAuth è «In fase di test», aggiungi il tuo indirizzo email in Schermata di consenso OAuth → Utenti di test.\n");
        if (errDesc) console.error("[OAuth]", errDesc, "\n");
        res.end(accessDeniedHelpHtml(errDesc));
      } else {
        res.end(`<p>Errore OAuth: ${escapeHtml(err)}</p><p>${escapeHtml(errDesc)}</p>`);
      }
      server.close();
      process.exit(1);
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    if (!code) {
      res.end("<p>Nessun code nella URL.</p>");
      server.close();
      process.exit(1);
      return;
    }
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      res.end(
        "<p>Google non ha restituito refresh_token. Riprova dopo aver revocato l’accesso dell’app in myaccount.google.com/permissions oppure usa prompt=consent (già impostato).</p>"
      );
      server.close();
      process.exit(1);
      return;
    }
    res.end(
      "<p>OK. Chiudi questa scheda: il refresh token è stato stampato nel terminale. Copialo in ADSENSE_OAUTH_REFRESH_TOKEN.</p>"
    );
    console.log("\n--- Aggiungi in admin/.env.local ---\n");
    console.log(`ADSENSE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    server.close();
  } catch (e) {
    console.error(e);
    res.writeHead(500);
    res.end("Errore");
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Apri questa URL nel browser (account Google con accesso AdSense attivo):\n");
  console.log(authUrl);
  console.log(`\nIn attesa del redirect su ${redirectUri} …\n`);
});
