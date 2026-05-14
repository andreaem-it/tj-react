# Resoconto analisi progetto TechJournal

Documento generato in seguito a revisione del codice di **techjournal-clone** (frontend Next.js), con riferimento ai repository correlati **tj-api** (backend Express) e **tj-react-admin** (pannello amministrativo Next.js).

---

## 1. Panoramica architettura

| Componente | Ruolo |
|------------|--------|
| **techjournal-clone** | Sito pubblico: rendering articoli e categorie, proxy `/api/*` verso tj-api, integrazioni GA4/AdSense/iubenda, Price Radar, compatibilità Apple, feed RSS, sitemap, endpoint “agent-ready” (OpenAPI, MCP, markdown). |
| **tj-api** | API centralizzata: articoli, newsletter, analytics, upload, Price Radar, webhook WordPress, DB (Neon/LibSQL), integrazioni Google ecc. |
| **tj-react-admin** | Back-office editoriale (TipTap, Next 16). |

Il frontend dipende fortemente da **variabili d’ambiente** (`TJ_API_BASE_URL`, URL pubblici API, segreti auth). La lista è documentata in `.env.example`.

---

## 2. Stack tecnologico (clone)

- **Next.js 16**, **React 19**, **TypeScript**, **Tailwind CSS 4**
- **Node ≥ 22.13** (engines in `package.json`)
- Librerie rilevanti: `jose` (JWT sessioni admin), `bcryptjs`, `sharp`, `@mep-agency/next-iubenda` (versione **alpha**), Font Awesome, Vercel Analytics/Speed Insights

---

## 3. Funzionalità principali

- **Home e categorie**: dati da API WordPress/tj (`lib/api.ts`), griglia con **caricamento incrementale** (`HomeLoadMoreGrid`, infinite scroll + fallback “carica altro”).
- **Articoli**: URL `/[categoria]/[slug]`, redirect dalla vecchia forma `/[slug]` quando lo slug è un post, canonical e Open Graph per articolo.
- **Ricerca**: `/search` con `robots: noindex` (coerente per pagine di risultato).
- **Price Radar**: elenco prodotti, pagine `/price-radar/[asin]` (contenuto ancora essenziale; in codice è annotato sviluppo futuro dello storico prezzi).
- **Compatibilità Apple**: hub e schede device/OS; pagine **dynamic** (nessuna cache ISR dichiarata sul hub — impatto su latenza e costi).
- **Feed RSS** (`/feed.xml`): ultimi post (limite **50** nella route).
- **Consenso cookie / iubenda**, **AdSense**, **GA4** (page view lato client dove previsto).
- **Admin**: route `/api/admin/*` protette da sessione JWT (`AUTH_SECRET` ≥ 32 caratteri); inoltro verso tj-api.
- **Webhook** WordPress: proxy POST verso upstream (validazione secret lato **tj-api**).
- **Esperienza “agenti”**: markdown su richiesta `Accept: text/markdown`, `.well-known/*`, OpenAPI, OAuth discovery — superficie ampia da mantenere allineata e sicura.

---

## 4. SEO — punti di forza

- **`lang="it"`** sul documento, **metadataBase** e template titoli nel layout.
- **Canonical** sulle pagine articolo e su Price Radar prodotto.
- **Open Graph / Twitter Card** a livello articolo (titolo, descrizione, immagine, tipo `article`).
- **JSON-LD**: `Organization`, `WebSite` + `SearchAction` (`SiteStructuredData`), **Article** per scheda (`ArticleStructuredData`).
- **Sitemap** (`app/sitemap.ts`): home, categorie, articoli (con dedup e limite pagine), pagine istituzionali, `feed.xml`; **revalidate** 3600s.
- **robots.txt** dinamico: disallow `/api/`, riferimento sitemap; direttiva **`Content-Signal`** (non standard universalmente supportata — vedi criticità).
- **RSS** collegato dai metadata (`alternates` tipo `application/rss+xml`).
- Pagina **search** impostata correttamente come **noindex, follow**.

---

## 5. SEO e contenuto — criticità e miglioramenti

1. **Data di modifica**: in metadata e JSON-LD articolo, `modifiedTime` / `dateModified` coincidono spesso con **`post.date`** (stesso valore della pubblicazione). Se il backend espone una data di ultima modifica reale, conviene usarla per accuratezza verso Google News / freshness.
2. **Sitemap incompleta rispetto al sito**: sono inclusi hub `/compatibility` e `/price-radar`, ma **non** le URL profonde tipo `/compatibility/device/...`, `/compatibility/os/...`, né le pagine prodotto **`/price-radar/[asin]`**. Le pagine ASIN hanno canonical ma restano **orfane** dalla sitemap (scopribilità ridotta).
3. **Feed RSS limitato a 50 articoli**: per aggregatori e completezza storica può essere stretto; valutare paginazione del feed o aumento controllato del limite.
4. **Pagina `/docs` e altre route secondarie**: verificare che abbiano titoli/descrizioni dedicati se devono essere indicizzate (non analizzato nel dettaglio ogni sottopagina).
5. **`keywords` nel layout**: attributo largamente ignorato dai motori principali; impatto trascurabile, eventualmente ridondante.

---

## 6. Sicurezza, affidabilità e criticità operative

1. **Sanitizzazione HTML articoli** (`lib/sanitizeRichHtml.ts`): basata su **regex** (rimozione script, iframe, handler, `javascript:` ecc.). È più fragile di un sanitizzatore tipo DOMPurify lato server o una pipeline CMS fidata; per contenuti WordPress molto ricchi conviene una revisione periodica o uno strategia_allowlist più robusta.
2. **Content-Security-Policy**: nel middleware è impostato solo **`frame-ancestors 'none'`** (insieme a `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`). Non c’è CSP completa per `script-src` / `style-src`: tipico quando si integrano AdSense, GA e iubenda, ma espone dipendenza dalla sicurezza degli script di terze parti e dal contenuto sanitizzato.
3. **`TJ_API_BASE_URL` assente**: le route proxy `/api/*` rispondono **503** (`tjApiProxy`). In produzione deve essere sempre configurato sul deploy Next (vedi `.env.example`).
4. **`AUTH_SECRET` debole o assente**: sessione admin non valida; route admin restano **401** — comportamento corretto ma richiede secret forte in produzione.
5. **Superficie API pubblica**: OAuth discovery, MCP, markdown rewrite aumentano la superficie da monitorare (rate limiting, abuse, allineamento versioni documentazione).
6. **Last-Modified nel middleware**: fallback a **data deploy** (`DEPLOY_LAST_MODIFIED`) per molte risposte può non riflettere l’effettiva freschezza editoriale delle pagine HTML.
7. **Dipendenza alpha**: `@mep-agency/next-iubenda` in alpha — valutare pinning rigoroso e test regressione su aggiornamenti.
8. **Ottimizzazione immagini**: default **passthrough** (`NEXT_IMAGE_PASSTHROUGH` diverso da `0`) per evitare errori 402 in produzione; implica meno ottimizzazione automatica rispetto al loader Next standard (trade-off performance SEO/Core Web Vitals vs stabilità billing).

---

## 7. Osservazioni UX / funzionali (non bloccanti)

- **`HomeLoadMoreGrid`**: la condizione iniziale `hasMore` combina `initialPagesConsumed`, `initialTotalPages` e lunghezza post; in scenari con pochi post in prima pagina vale un test manuale per evitare stati “carica ancora” incoerenti.
- **Tema**: `<html className="dark ...">` forza dark mode a livello radice; il toggle tema (se presente altrove) va verificato per coerenza con preferenze utente.
- **Price Radar dettaglio ASIN**: pagina ancora minimale rispetto alla promessa SEO nella description (monitoraggio/storico).

---

## 8. Repo satellite (sintesi)

- **tj-api**: backend Express con molte integrazioni (S3, GA, Neon, LibSQL, Sharp, ecc.). Sicurezza e segreti sono qui centralizzati (webhook, DB, OAuth).
- **tj-react-admin**: admin separato sulla porta 3001 in dev; allineamento versioni Next/React con il clone riduce sorprese di build.

---

## 9. Priorità consigliate (ordine indicativo)

| Priorità | Azione |
|----------|--------|
| Alta | Completare **sitemap** per URL compatibilità e prodotti Price Radar indicizzabili, oppure escluderle esplicitamente da indicizzazione se volute fuori SERP. |
| Alta | Introdurre **`dateModified`** reale dai dati CMS/API ove disponibile. |
| Media | Rafforzare **sanitizzazione HTML** (allowlist o libreria consolidata) per contenuti ricchi. |
| Media | Documentare e testare **CORS / proxy**: `NEXT_PUBLIC_TJ_API_BASE_URL` vs solo proxy same-origin. |
| Bassa | Valutare CSP più ampia in modalità report-only prima di enforcement. |
| Bassa | Ampliare o paginare il **feed RSS** se serve distribuzione ampia. |

---

*Questo resoconto riflette lo stato del codice al momento dell’analisi statica; non sostituisce audit di sicurezza professionale, Lighthouse/PageSpeed sistematici o test end-to-end in staging.*
