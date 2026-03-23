/**
 * Ottiene un refresh token OAuth per AdSense (scope readonly).
 *
 * Prerequisiti in Google Cloud (stesso progetto dove abiliti AdSense Management API):
 * - Credenziali OAuth → Tipo "App desktop" (o Web con redirect sotto).
 * - Schermata consenso OAuth: utente di test = l’email che accede ad AdSense (es. info@…).
 *
 * Uso:
 *   export ADSENSE_OAUTH_CLIENT_ID=...
 *   export ADSENSE_OAUTH_CLIENT_SECRET=...
 *   npm run adsense-oauth
 *
 * Aggiungi come URI di reindirizzamento autorizzato (se tipo Web):
 *   http://127.0.0.1:34567/oauth2callback
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
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    if (err) {
      res.end(`<p>Errore OAuth: ${err}</p>`);
      server.close();
      process.exit(1);
      return;
    }
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
