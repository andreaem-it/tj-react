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

- [x] Campo JSON **`modified`** negli endpoint `tj/v1` (lista e singolo post). Confermato in produzione (2026-08-21): presente su ogni post.
- [x] Plugin **v1.2.0** — pagina autore (§40): `authorSlug` su `tj/v1/posts`/`tj/v1/post/:slug`, filtro `?author=<slug>`, endpoint `GET tj/v1/author/:slug`. **Pubblicato e verificato in produzione il 2026-08-21**: il campo è presente e l'endpoint risponde correttamente (404 pulito quando non c'è corrispondenza). Nota: gli articoli recenti hanno `authorName`/`authorSlug` vuoti perché non hanno un utente WordPress valido come autore (contenuti ingeriti automaticamente) — `/autore/[slug]` diventerà utile sul primo articolo attribuito a un utente reale (es. una recensione firmata), che è il caso d'uso per cui esiste.
- [x] Plugin **v1.3.0** — modello dati recensioni (§47): campo `review` da custom field. **Pubblicato e verificato il 2026-08-21**: `review: null` di default, come atteso finché nessun post ha i custom field compilati.

  **Custom field da compilare per una recensione vera** (nessuno è generato, tutti a mano):
  - `tj_review_rating` — **obbligatorio perché compaia qualcosa**: voto numerico da 0 a 10 (es. `8.5`).
  - `tj_review_pros` — un pro per riga.
  - `tj_review_cons` — un contro per riga.
  - `tj_review_test_duration` — es. "3 settimane di utilizzo quotidiano".
  - `tj_review_methodology` — nota libera su come è stato condotto il test.
  - `tj_review_verdict` — una riga di conclusione.

- [x] Plugin **v1.4.0** — cronologia aggiornamenti (§19, §35-36): campo `changelog` da custom field `tj_changelog`. **Pubblicato e verificato il 2026-08-21**: `changelog: []` di default, come atteso.

  **Custom field `tj_changelog`**: una riga per voce, formato `AAAA-MM-GG: nota` (es. `2026-08-20: Aggiunte informazioni sulla Beta 6.`). Righe senza questo formato vengono ignorate silenziosamente, non bloccano le altre.

---

## Task operativo pre-esistente (views)

- [ ] **Proxy `/api/views/:postId`**: verificare in produzione che risponda JSON (backend `TJ_API_BASE_URL` + endpoint allineati su `api.techjournal.it`), poi test end-to-end incremento views dalla pagina articolo.
