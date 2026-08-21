# TODO — TechJournal Clone

Stato rispetto al **RESOCONTO-PROGETTO.md** e ai fix operativi.

## Dal resoconto — implementato in codice

- [x] **Sitemap**: URL `/compatibility/device/{slug}`, `/compatibility/os/{slug}`, prodotti attivi `/price-radar/{asin}`, `/docs`; `lastModified` articoli da `postModifiedIso` (usa `modified` se presente).
- [x] **`modified` / dateModified**: campo nel plugin WP (`class-tj-post-mapper.php`) + tipo `PostWithMeta` + metadata articolo, JSON-LD, feed `lastBuildDate`.
- [x] **Sanitizzazione HTML**: `isomorphic-dompurify` in `lib/sanitizeRichHtml.ts`.
- [x] **Feed RSS**: fino a **100** articoli (`FEED_POSTS_LIMIT`), `lastBuildDate` basato sulla data di modifica massima tra gli item.
- [x] **Meta `keywords`**: rimossi dal layout (ridondanti per i motori principali).
- [x] **`HomeLoadMoreGrid`**: stato iniziale `hasMore` solo da `initialPagesConsumed < initialTotalPages` (niente falso positivo con griglia ≥ 8 item).
- [x] **Newsletter (mobile)**: pulsante chiusura **assoluto in alto a destra**, area tap 40×40px, `safe-area-inset-bottom`, padding superiore per non coprire il titolo.

## Dal resoconto — non applicabile / manuale

- [ ] **CSP report-only**: richiede policy dedicata e tuning con AdSense/GA/iubenda; non impostata per evitare rumore e regressioni.
- [ ] **`TJ_API_BASE_URL` / `AUTH_SECRET`**: configurazione deploy (già documentata in `.env.example`).
- [ ] **Superficie OAuth/MCP**: monitoraggio rate limiting / abuse lato **tj-api** e infrastruttura.
- [ ] **Pinning dipendenza alpha `next-iubenda`**: decisione di versioning a parte.

## Deploy WordPress

- [ ] Pubblicare sul sito WordPress la versione aggiornata del plugin che espone il campo JSON **`modified`** negli endpoint `tj/v1` (lista e singolo post). Fino al deploy, il frontend continua a usare **`date`** come fallback.
- [ ] Pubblicare il plugin **v1.2.0** (`scripts/wp-plugin/techjournal-api`) per la pagina autore (§40): aggiunge `authorSlug` a `tj/v1/posts`/`tj/v1/post/:slug`, il filtro `?author=<slug>` su `tj/v1/posts` e il nuovo endpoint `GET tj/v1/author/:slug` (nome, slug, bio, avatar; 404 per utenti senza post pubblicati). Fino al deploy, `/autore/[slug]` risponde 404 e il box "Scritto da" non compare: degrado corretto, non un bug del frontend.
- [ ] Pubblicare il plugin **v1.3.0** per il modello dati recensioni (§47): aggiunge il campo `review` a `tj/v1/posts`/`tj/v1/post/:slug`, letto dai custom field del post (menu **Schermata opzioni → Campi personalizzati**, nell'editor di un articolo). Fino al deploy `review` è sempre assente e `ReviewBox`/lo schema `Review` non compaiono — degrado corretto.

  **Custom field da compilare per una recensione vera** (nessuno è generato, tutti a mano):
  - `tj_review_rating` — **obbligatorio perché compaia qualcosa**: voto numerico da 0 a 10 (es. `8.5`).
  - `tj_review_pros` — un pro per riga.
  - `tj_review_cons` — un contro per riga.
  - `tj_review_test_duration` — es. "3 settimane di utilizzo quotidiano".
  - `tj_review_methodology` — nota libera su come è stato condotto il test.
  - `tj_review_verdict` — una riga di conclusione.

---

## Task operativo pre-esistente (views)

- [ ] **Proxy `/api/views/:postId`**: verificare in produzione che risponda JSON (backend `TJ_API_BASE_URL` + endpoint allineati su `api.techjournal.it`), poi test end-to-end incremento views dalla pagina articolo.
