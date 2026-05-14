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

---

## Task operativo pre-esistente (views)

- [ ] **Proxy `/api/views/:postId`**: verificare in produzione che risponda JSON (backend `TJ_API_BASE_URL` + endpoint allineati su `api.techjournal.it`), poi test end-to-end incremento views dalla pagina articolo.
