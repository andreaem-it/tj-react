# Code Review Totale — 11 giugno 2026

Review completa dei tre progetti: `techjournal-clone` (frontend pubblico), `tj-api` (backend API), `tj-react-admin` (pannello admin).

**Typecheck TypeScript: 0 errori su tutti e tre i progetti.**

---

## Sintesi trasversale

| Tema | Progetti coinvolti | Impatto |
|------|--------------------|---------|
| Sanitizzazione HTML debole (regex-based, bypassabile) + nessuna sanitizzazione server-side al salvataggio | tj-api, tj-react-admin, techjournal-clone | Stored XSS end-to-end (admin → DB → sito pubblico) |
| Race condition (ingest, autosave, load-more, scrape cron) | tj-api, tj-react-admin, techjournal-clone | Dati duplicati, perdita modifiche, costi OpenAI doppi |
| Errori mascherati come dati vuoti (cache `[]`, 200 con array vuoto) | techjournal-clone, tj-react-admin | Outage invisibili, pagine sparite |
| Variabili d'ambiente non validate all'avvio | tutti e tre | Fallimenti opachi a runtime |
| Assenza di rate limiting su endpoint pubblici | tj-api, techjournal-clone | DoS economico, spam contatori |

### Top 5 priorità

1. **Sanitizzazione HTML end-to-end** (salvataggio in tj-api + rendering nei due frontend) — CRITICO/ALTO
2. **SSRF su ingest feed** (redirect e URL item non validati) — tj-api, ALTO
3. **Race condition elaborazione ingest** → articoli duplicati e doppio costo OpenAI — tj-api, ALTO
4. **Soft-404**: articolo inesistente risponde 200 e viene indicizzato — techjournal-clone, ALTO
5. **Price Radar**: `GET /products` senza paginazione + view/click senza rate limit — tj-api, ALTO

---

# 1. tj-api (backend)

> Nessuna SQL injection trovata (tagged template Neon, parametri Turso). Auth admin solida su tutte le route verificate.

## ALTO

### 1.1 SSRF server-side su fetch ingest
- **File:** `src/modules/ingestor/services/feedSync.ts` (righe 54–68, 100); `src/modules/ingestor/services/fetchArticlePageText.ts` (14–22); `src/modules/ingestor/services/elaborateItem.ts` (52, 95)
- `validateFeedUrl()` controlla solo l'hostname del feed al parse: `rss-parser` segue redirect verso host interni, i link degli item RSS non vengono validati, `fetchArticlePagePlainText()` / `fetchOgImageUrl()` usano `redirect: "follow"` senza ricontrollo. Un feed compromesso può far raggiungere reti private/metadata cloud.
- **Fix:** risolvere DNS e bloccare IP privati/link-local alla connessione; vietare redirect o re-validare ogni hop; whitelist anche sugli URL degli item.

### 1.2 Race condition su elaborazione ingest → articoli duplicati + doppio costo OpenAI
- **File:** `src/modules/ingestor/services/elaborateItem.ts` (38–47, 97–117); `src/modules/ingestor/services/ingestDb.ts` (262–279)
- Due richieste parallele a `POST /ingest/items/:id/elaborate` passano entrambe il check `status !== 'elaborated'`, chiamano GPT e creano due articoli.
- **Fix:** claim atomico `UPDATE ... SET status = 'processing' WHERE id = $1 AND status = 'pending' RETURNING *`; transazione tra creazione articolo e update item.

### 1.3 `GET /api/price-radar/products` senza paginazione → DoS memoria/CPU
- **File:** `src/modules/price-radar/services/productQueries.ts` (128–211); `src/modules/price-radar/http/publicRoutes.ts` (56–93)
- Carica tutti i prodotti attivi con due subquery correlate su `price_history`, poi ordina in JavaScript. Endpoint pubblico.
- **Fix:** `LIMIT`/`OFFSET` o cursor lato SQL; ordinamento nel DB.

### 1.4 Secret `PRICE_RADAR_FEED_WRITE_KEY` in query string
- **File:** `src/modules/price-radar/http/publicRoutes.ts` (191–194)
- La chiave in `?key=...` finisce in log proxy/CDN, history, Referer. Compromissione = scrittura arbitraria prezzi.
- **Fix:** spostare su header (`Authorization: Bearer` o `X-Api-Key`); ruotare la chiave.

### 1.5 `incrementProductView`/`incrementProductClick` → refresh priorità completo a ogni POST pubblico
- **File:** `src/modules/price-radar/services/productQueries.ts` (375–432); `src/modules/price-radar/http/publicRoutes.ts` (235–278)
- Ogni view/click esegue `refreshProductPriorityFromMetrics()` (SELECT multipli + UPDATE). Endpoint pubblici senza rate limit → DoS economico.
- **Fix:** debounce/coda async per il ricalcolo; UPDATE atomico singolo; rate limiting per IP/postId.

## MEDIO

### 1.6 Race condition su scrape cron (nessun lock righe)
- **File:** `src/modules/price-radar/services/scrapeBatch.ts` (102–118)
- Worker paralleli possono selezionare gli stessi prodotti. **Fix:** `SELECT ... FOR UPDATE SKIP LOCKED` o claim atomico su `next_check_at`.

### 1.7 Race condition reset contatori 24h (views/clicks)
- **File:** `src/modules/price-radar/services/productQueries.ts` (378–401)
- Pattern read+write non atomico al confine del periodo. **Fix:** singolo UPDATE SQL con `CASE WHEN`.

### 1.8 `upsertPriceFeedItems` inserisce sempre in `price_history`
- **File:** `src/modules/price-radar/services/priceFeedQueries.ts` (237–240, 248–257)
- Riga history anche se il prezzo non cambia → crescita incontrollata. **Fix:** inserire solo su variazione (come `scrapeBatch.shouldInsertHistory`).

### 1.9 Nessuna transazione su import bulk compatibilità
- **File:** `src/modules/compatibility/services/compatibilityBulkApply.ts` (146–182)
- Fallimento a metà lascia DB parzialmente aggiornato. **Fix:** transazione con rollback.

### 1.10 Avvio server ignora errori schema
- **File:** `src/server.ts` (55–75)
- `ensure*Schema()` fallisce → solo `console.error`, server resta up. **Fix:** `process.exit(1)` in prod; health check.

### 1.11 Leak messaggi errore interni in produzione
- **File:** `src/modules/price-radar/http/cronRoutes.ts` (24–26); `src/modules/ingestor/http/cronIngestRoutes.ts` (30–32); `src/modules/price-radar/http/adminRoutes.ts` (37–39, 70–72, …); `src/modules/webhooks-social/services/wpWebhookService.ts` (166–167); `src/modules/articles/http/adminArticlesRoutes.ts` (677–681)
- `e.message` restituito al client anche in prod. **Fix:** messaggio generico in prod, dettaglio solo nei log.

### 1.12 Newsletter: validazione email debole + leak risposta Brevo
- **File:** `src/modules/webhooks-social/services/newsletterService.ts` (10–12, 68–71)
- Basta `includes("@")`; su 502 restituisce `errText` grezzo. **Fix:** regex robusta; messaggio generico su errori upstream.

### 1.13 Assenza rate limiting su endpoint pubblici sensibili
- **File:** `src/server.ts`; route auth, views, newsletter, price-radar view/click
- Brute-force login, spam contatori, abuso Brevo/OpenAI. **Fix:** `express-rate-limit` o limiter edge.

### 1.14 Session JWT non riallineata a `ADMIN_USER`
- **File:** `src/modules/analytics/services/sessionAuth.ts` (25–29)
- Non verifica `payload.user === process.env.ADMIN_USER`: cambio credenziali → sessioni vecchie valide fino a 24h. **Fix:** confronto a ogni request o versione config nel payload.

### 1.15 `POST /api/admin/articles` — status non validato
- **File:** `src/modules/articles/http/adminArticlesRoutes.ts` (riga 183)
- `o.status as ArticleStatus` accetta stringhe arbitrarie. **Fix:** stessa whitelist del PUT (378–381).

### 1.16 `listProductsAdmin` senza LIMIT
- **File:** `src/modules/price-radar/services/adminQueries.ts` (66–144)
- Come 1.3 ma su route protetta. **Fix:** paginazione obbligatoria.

### 1.17 `POST /api/price-radar/prices` — nessun limite dimensione batch
- **File:** `src/modules/price-radar/services/priceFeedQueries.ts` (248–257); `publicRoutes.ts` (211–218)
- Array illimitato (solo cap JSON 2MB). **Fix:** cap esplicito (es. 100 item/request).

### 1.18 Feed URL non validato alla registrazione admin
- **File:** `src/modules/ingestor/http/adminIngestRoutes.ts` (40–53)
- `feed_url` accettato senza `validateFeedUrl()`. **Fix:** riusare la validazione su POST/PATCH fonti.

### 1.19 `restoreArticleFromRevision` senza transazione
- **File:** `src/modules/articles/services/articleRevisionsService.ts` (107–136)
- Revisione "before-restore" + update non atomici. **Fix:** transazione unica.

### 1.20 Upload R2 parziale senza rollback
- **File:** `src/modules/articles/http/adminArticlesRoutes.ts` (642–644)
- Fallimento a metà del loop `r2Put` lascia oggetti orfani. **Fix:** processare tutto in memoria prima dei put, o delete compensativo.

## BASSO

### 1.21 Cast TypeScript non sicuri su dati DB
- **File:** `src/modules/articles/services/articlesService.ts` (29–30); `src/modules/articles/services/articleRevisionsService.ts` (35); `src/modules/analytics/services/sessionAuth.ts` (26–27)
- `as ArticleStatus`, `as Article`, `payload.user as string` senza guard runtime.

### 1.22 `env.ts` minimalista — nessuna validazione centralizzata
- **File:** `src/config/env.ts` — solo `PORT`/`NODE_ENV`; gli altri secret letti ad hoc. **Fix:** `validateEnv()` con schema all'avvio.

### 1.23 `scripts/price-radar-cron.ts` — commenti obsoleti (menzionano SQLite, il codice usa Neon/Postgres)

### 1.24 `deleteMedia` dead code senza route HTTP né delete R2
- **File:** `src/modules/articles/services/mediaService.ts` (159–161)

### 1.25 Login dev rivela username vs password errati
- **File:** `src/modules/auth-admin/http/authRoutes.ts` (50–55) — enumeration utente in non-prod.

## Aree pulite (tj-api)

SQL injection assente; auth admin verificata su ogni handler; cron con `timingSafeEqual`; webhook WP con secret + idempotenza; CORS whitelist; error handler globale maschera in prod; pool Neon singleton; upload immagini con limiti/MIME whitelist/Sharp.

---

# 2. techjournal-clone (frontend pubblico)

## ALTO

### 2.1 Articolo inesistente → HTTP 200 (soft 404)
- **File:** `app/[slug]/[articleSlug]/page.tsx` (55–58, 103–106)
- Post `null` → render `ArticleUnavailable` con status 200; `generateMetadata` non imposta `robots: noindex`. I crawler indicizzano URL fantasma. (`reader/page.tsx` riga 27 usa correttamente `notFound()`.)
- **Fix:** `notFound()` quando il post non esiste.

### 2.2 "Articoli correlati" con dati errati
- **File:** `components/ArticlePageExtras.tsx` (18–31)
- `ArticleRelatedPosts` scarica sempre `/api/posts/1` (ultimi post globali) e filtra client-side per categoria, ignorando `fetchRelatedPosts` (`lib/api.ts` 354–370). Correlati spesso assenti o irrilevanti.
- **Fix:** fetch lato server con `fetchRelatedPosts({ baseSlug, categoryId })` o endpoint dedicato.

### 2.3 Sidebar articolo: "trending" = ultimi post homepage
- **File:** `components/ArticlePageExtras.tsx` (53–61)
- `TrendingSidebar` popolata da `/api/posts/1` senza ordinamento per visualizzazioni.
- **Fix:** passare i trending da SSR (`fetchMostReadPosts` / `fetchTrendingWeekAndMonth`) o endpoint `/api/trending`.

### 2.4 Sanitizzazione HTML insufficiente (rischio stored XSS)
- **File:** `lib/sanitizeRichHtml.ts` (5–21); usato in `components/ArticleBody.tsx` (141), `components/AuthorCard.tsx` (54), `components/IubendaPolicyContent.tsx` (84)
- Regex-only: non blocca `data:`, `svg`, `math`, `form`, `vbscript:`. Contenuto compromesso → script via `dangerouslySetInnerHTML`.
- **Fix:** sanitizzatore battle-tested (es. `isomorphic-dompurify` con allowlist), idealmente upstream in tj-api.

### 2.5 Cache categorie vuote dopo errore API
- **File:** `lib/api.ts` (468–488)
- `fetchCategoriesRaw` su `!res.ok` restituisce `[]` e `unstable_cache` lo memorizza per 600s → tutte le pagine categoria in `notFound()` per 10 minuti dopo un errore transitorio.
- **Fix:** non cachare il risultato vuoto su errore (throw o TTL breve).

## MEDIO

### 2.6 Race condition su "Load more" / infinite scroll
- **File:** `components/HomeLoadMoreGrid.tsx` (26–48, 54–75, 77–83)
- Guard `isLoading` nello state: trigger simultanei causano fetch duplicati. **Fix:** mutex sincrono con `useRef`.

### 2.7 Paginazione bloccata se la API restituisce solo duplicati
- **File:** `components/HomeLoadMoreGrid.tsx` (32–41)
- Tutti gli ID già presenti → `hasMore` resta `true`, fetch ripetuti. **Fix:** forzare `setHasMore(false)` o saltare pagine.

### 2.8 Contatori social hardcoded
- **File:** `components/HomeContent.tsx` (65–83)
- "9 Seguono" / "38 Followers" fissi; `fetchSocialStats` (`lib/tjApiClient.ts` 374–389) mai usato. **Fix:** caricare da `/api/social-stats` con fallback.

### 2.9 Canonical vs shareUrl: trailing slash inconsistente
- **File:** `app/[slug]/[articleSlug]/page.tsx` (60–61 vs 114)
- Canonical senza slash, shareUrl con slash → duplicazione URL. **Fix:** allineare i due formati.

### 2.10 Immagine OG default troppo piccola
- **File:** `app/og-default.png/route.ts` (9–12)
- Fallback `logo-techjournal-250.png` (250px) vs 1200×630 dichiarato. **Fix:** asset 1200×630 in `OG_DEFAULT_IMAGE_URL`.

### 2.11 `fetchMostReadPosts` campiona solo 25 post
- **File:** `lib/api.ts` (324–341)
- Ordina al massimo 25 post della pagina 1: ranking sbagliato su cataloghi grandi. **Fix:** endpoint backend top-by-views.

### 2.12 Megamenu: errori upstream mascherati come array vuoto
- **File:** `app/api/megamenu/[slug]/route.ts` (66–71)
- Proxy fallito senza cache → `200` con `[]`. **Fix:** 502/503 senza cache o campo `_error`.

### 2.13 `TJ_API_BASE_URL` non validato all'avvio
- **File:** `lib/config/tjApi.ts`, `lib/tjApiProxy.ts` (67–73)
- Variabile mancante → 503 su tutte le route proxy solo a runtime. **Fix:** fail-fast in build/CI.

### 2.14 `fetchTjPosts` nasconde errori come lista vuota
- **File:** `lib/api.ts` (196–199)
- Timeout/HTTP ≥400 → `{ posts: [], totalPages: 1 }`: home "vuota" senza segnale per il monitoring. **Fix:** distinguere errore da dato vuoto.

### 2.15 Date relative negative con clock skew
- **File:** `app/[slug]/[articleSlug]/page.tsx` (47–52); `components/ArticleCard.tsx` (17–27)
- Date future → "Pubblicato -3 ore fa". **Fix:** `Math.max(0, diffMs)`.

## BASSO

### 2.16 Newsletter: messaggio di successo mai mostrato
- **File:** `components/NewsletterModal.tsx` (47–49) — `close()` subito dopo `setMessage(...)` → il componente fa `return null` prima di mostrare la conferma.

### 2.17 Incremento visualizzazioni bypassabile lato client
- **File:** `components/ArticleBody.tsx` (65–91) — dedup solo `sessionStorage`. Fix lato tj-api (rate limit/dedup IP).

### 2.18 Proxy iubenda policy senza rate limit
- **File:** `app/api/iubenda-policy/route.ts` (8–46) — qualsiasi `id` inoltrato a iubenda. Fix: whitelist id da env + rate limit.

### 2.19 `useThirdPartyScriptProxy` in Server Component
- **File:** `app/layout.tsx` (78); `lib/thirdPartyScriptUrls.ts` (9–16) — nome da hook ma è funzione pura; comportamento diverso SSR vs client solo in dev. Fix: rinominare (es. `shouldProxyThirdPartyScripts`).

## Aree pulite (techjournal-clone)

Route admin protette; nessuna API key hardcoded; proxy tj-api con loop detection e limiti body; JSON-LD sicuro; feed RSS con `escapeXml`; `robots.txt` con `Disallow: /api/`; pochi `as any` (solo `window`/AdSense).

---

# 3. tj-react-admin (pannello admin)

## CRITICO

### 3.1 `AUTH_SECRET` mancante o diverso da tj-api → sessione sempre invalida
- **File:** `lib/auth.ts` (11–12, 19); `.env.example` (23–24)
- Il login passa per tj-api che firma il JWT; l'admin verifica localmente con `AUTH_SECRET`. Se manca, è <32 caratteri o non coincide con tj-api: `getSessionFromToken` → sempre `null` ("login ok ma nulla funziona").
- **Fix:** validare all'avvio (esistenza + lunghezza); documentare che deve essere identico a tj-api.

### 3.2 Contenuto HTML salvato senza sanitizzazione server-side
- **File:** `app/(dashboard)/articoli/ArticoloForm.tsx` (456–461, 486–490)
- `content` dell'editor TipTap inviato così com'è; `sanitizeRichHtml` usato solo in anteprima (riga 145). tj-api persiste senza sanitizzazione → stored XSS sul sito pubblico.
- **Fix:** sanitizzare server-side (tj-api o route proxy) prima del persist; difesa in profondità anche in `save()`.

## ALTO

### 3.3 Sanitizzazione anteprima bypassabile (XSS nell'admin)
- **File:** `lib/sanitizeRichHtml.ts` (25–34); `ArticoloForm.tsx` (riga 811)
- Regex-based: non blocca `svg`, `math`, entità HTML (`onerror&#61;`), `data:` non-html. Anteprima con `dangerouslySetInnerHTML` → XSS nell'area admin. **Fix:** DOMPurify con allowlist.

### 3.4 Link `javascript:` nei contenuti legacy BlockNote
- **File:** `lib/legacyBlockNoteToHtml.ts` (50–53)
- `href` escapato ma non validato sul protocollo. **Fix:** solo `http:`, `https:` e path relativi (come `normalizeEditorLink`).

### 3.5 HTML legacy/WP caricato nell'editor senza sanitizzazione
- **File:** `lib/legacyBlockNoteToHtml.ts` (149–156)
- `initialHtmlFromStoredContent` restituisce contenuto grezzo se non è BlockNote JSON. **Fix:** sanitizzare sempre prima di `setContent`.

### 3.6 Nessun `middleware.ts` — difesa unica per route
- Protezione attuale: `app/(dashboard)/layout.tsx` (16–24) + check per file su tutte le 30+ route API (verificate). Una nuova route senza `getSessionFromRequest` sarebbe aperta.
- **Fix:** `middleware.ts` che verifica `admin_session` su `/api/admin/*` e pagine non-login come rete di sicurezza.

### 3.7 Proxy inoltra header `Authorization` e `X-TJ-Webhook-Secret` dal client
- **File:** `lib/tjApiProxy.ts` (116–123)
- Un client autenticato può aggiungere header sensibili verso tj-api → rischio escalation/trigger non previsti. **Fix:** non inoltrare header sensibili dal client.

### 3.8 Race condition autosave / salvataggio manuale
- **File:** `app/(dashboard)/articoli/ArticoloForm.tsx` (440–576, 567–576)
- Autosave ogni 15s non serializzato con il salvataggio manuale: l'ultima risposta vince → perdita silenziosa di modifiche. **Fix:** mutex `saveInFlight` con ref; skip autosave se `saving`; `AbortController`.

## MEDIO

### 3.9 Redirect post-scadenza sessione perde il percorso corrente
- **File:** `app/(dashboard)/layout.tsx` (18–23) — sempre `/login?from=/`. **Fix:** passare il path corrente.

### 3.10 Dashboard analytics: errori HTTP non gestiti
- **File:** `app/(dashboard)/AdminDashboardStats.tsx` (264–267) — `fetch` senza check `res.ok`: un 401 viene trattato come `Ga4Response`. **Fix:** gestire `!res.ok` con redirect/messaggio.

### 3.11 Price Radar: stato errore incoerente tra status e prodotti
- **File:** `app/(dashboard)/price-radar/PriceRadarAdminView.tsx` (91–100) — `setError((e) => e ?? …)` preserva errori vecchi. **Fix:** `setError(null)` all'inizio di `load()`; errori separati.

### 3.12 Upload immagini nell'editor: errori inghiottiti
- **File:** `components/admin/ArticleHtmlEditor.tsx` (374–378) — `.catch(() => {})` senza feedback. **Fix:** toast/callback `onUploadError`.

### 3.13 `insertImageFromUrl` senza validazione URL
- **File:** `components/admin/ArticleHtmlEditor.tsx` (404–406) — qualsiasi URL inseribile (incluso `javascript:`). **Fix:** validare come `normalizeEditorLink`.

### 3.14 Race condition su caricamento articolo / media
- **File:** `ArticoloForm.tsx` (337–343, 212–253); `app/(dashboard)/media/MediaGallery.tsx` (74–104) — risposte stale applicate allo stato. **Fix:** flag `cancelled` o `AbortController`.

### 3.15 Variabili d'ambiente non validate all'avvio
- **File:** `lib/config/tjApi.ts` (6–10); `lib/priceRadarUpstream.ts` (7–12) — `TJ_API_BASE_URL` e `PRICE_RADAR_ADMIN_SECRET` falliscono solo a runtime. **Fix:** modulo `env.ts` con validazione.

### 3.16 Cast TypeScript che mascherano risposte API malformate
- **File:** `MediaGallery.tsx` (84); `components/compatibility/DevicesAdminClient.tsx` (41–47) — `res.json()` castato senza validazione. **Fix:** type guard/schema.

## BASSO

### 3.17 CSRF su mutazioni senza token dedicato — mitigato da cookie `httpOnly` + `SameSite: lax`; valutare `strict` o token CSRF.
### 3.18 Nessun security header in `next.config.ts` — mancano `X-Frame-Options`, `X-Content-Type-Options`, CSP, HSTS.
### 3.19 Slug di default `"articolo"` per titoli vuoti — `ArticoloForm.tsx` (144) → collisioni. Fix: suffisso random o blocco salvataggio.
### 3.20 `gpt_error`/titoli feed in JSX — React escapa, rischio attuale basso; attenzione se in futuro si usa HTML.

## Aree pulite (tj-react-admin)

Tutte le route `/api/admin/*` con check sessione; nessun segreto in `NEXT_PUBLIC_*`; `from` del login validato (no open redirect); secret Price Radar server-side; `dryRun` forzato su bulk import; script OAuth locale con escape.

---

# Conteggio complessivo

| Progetto | CRITICO | ALTO | MEDIO | BASSO |
|----------|---------|------|-------|-------|
| tj-api | 0 | 5 | 15 | 5 |
| techjournal-clone | 0 | 5 | 10 | 4 |
| tj-react-admin | 2 | 6 | 8 | 4 |
| **Totale** | **2** | **16** | **33** | **13** |

# Piano d'intervento consigliato

1. **Subito:** sanitizzazione HTML end-to-end (3.2 + 3.3 + 2.4 + 3.4 + 3.5), SSRF ingest (1.1), race ingest (1.2), soft-404 (2.1), paginazione + secret Price Radar (1.3, 1.4).
2. **Breve termine:** rate limiting (1.5, 1.13), correlati/trending (2.2, 2.3), cache categorie (2.5), autosave (3.8), middleware admin (3.6), transazioni (1.9, 1.19), fail-fast schema (1.10).
3. **Hardening:** validazione env centralizzata in tutti i progetti, messaggi errore uniformi in prod, security header admin, cleanup cast TypeScript.
