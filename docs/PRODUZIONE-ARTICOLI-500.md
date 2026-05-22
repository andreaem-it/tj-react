# Articoli 500 / 429 in produzione

## Sintomo

- `www.techjournal.it/categoria/slug-articolo` → **500** o pagina bianca
- In Rete: prima **429** con `x-vercel-mitigated: challenge`, poi **500**
- La **home** può funzionare mentre **tutti gli articoli** falliscono

## Causa reale (log Vercel 22:42 UTC)

```
Error: Failed to load external module jsdom … ERR_REQUIRE_ESM
page: '/mac/macbook-pro-oled-samsung-soglia-resa-produttiva'
```

`isomorphic-dompurify` → `jsdom` in SSR **rompe tutte le pagine articolo** (500).

Fix: `lib/sanitizeRichHtml.ts` senza jsdom (commit dopo `5fd691e`).

## Causa 429 su `/_next/static/*.js` (ChunkLoadError / MIME text/html)

Managed rule Vercel **`bot_filter` → action: `challenge`** (Firewall → Bot Management).
I chunk JS/CSS ricevono HTML challenge → browser rifiuta MIME type.

### Disattivare challenge (obbligatorio)

1. Vercel → progetto **tj-react** → **Firewall** → **Rules**
2. Sezione **Bot Management** → **Bot Protection**: passa da **Challenge** a **Log**
3. **Publish** le modifiche
4. (Opzionale) Menu `⋯` → **Disable Attack Mode** se attivo

Oppure da terminale (interattivo, non da agent):

```bash
vercel firewall attack-mode disable
```

## Causa 1 (obbligatoria): Attack Mode su Vercel

Non è nelle "Firewall rules" personalizzate. È **Attack Mode / Attack Challenge**:

1. Vercel Dashboard → progetto **techjournal** (frontend)
2. Menu **Firewall**
3. Scheda **Bot Management** (o menu `⋯` in alto a Firewall)
4. **Disable Attack Mode** / disattiva Attack Challenge
5. Attendi 5 minuti, svuota cache browser, ritesta

Riferimento: https://vercel.com/docs/vercel-firewall/attack-mode

Finché Attack Mode è attivo, anche `/api/health/post?slug=...` può rispondere con HTML challenge invece di JSON.

## Causa 2: Cloudflare (se proxy arancione)

Su `www.techjournal.it` compare `server: cloudflare`. Controlla:

- **Security → Bots** → Bot Fight Mode / Super Bot Fight
- **Security Level** → non "I'm Under Attack"
- Eventuale **Rate limiting** su path `/*`

## Verifica dopo deploy

```bash
curl -s "https://www.techjournal.it/api/health/post?slug=macbook-pro-oled-samsung-soglia-resa-produttiva"
```

Atteso: `{"ok":true,"title":"..."}`

Poi apri l’URL articolo nel browser (non solo curl).

## Env Vercel (Production)

Impostare almeno:

- `NEXT_PUBLIC_API_BASE` = `https://api.techjournal.it`
- `NEXT_PUBLIC_SITE_URL` = `https://www.techjournal.it`
- `NEXT_PUBLIC_WP_BASE` = `https://api.techjournal.it/wp-json/tj/v1`

Poi **Redeploy** (non solo cache).
