# Piano TechJournal — stato di avanzamento (94 punti)

Conversione in TODO del brief "Lead Developer / Product Architect" ricevuto il 2026-08-23.
Stato verificato con audit del codice reale su `techjournal-clone`, `tj-api`, `tj-react-admin` (non per supposizione).

Legenda: `[x]` esiste in codice · `[~]` parziale (vedi nota) · `[ ]` manca · righe senza checkbox = principio/vincolo guida, non una feature da spuntare.

---

## 1-6 — Ruolo, principio non negoziabile, distinzione automatico/umano

Principi guida, non feature. Da tenere come criterio di revisione per ogni nuova implementazione, non richiedono checkbox.

## 7. Non copiare iSpazio

Vincolo di design, nessuna verifica di codice applicabile.

## Sezione 7 (bis) — News

- [x] Le news sono generate automaticamente dall'autoposter (`tj-api/src/modules/ingestor/services/autoposter.ts`) con topic/entity associati.

## Guide evergreen

- [x] Distinzione content type `guide` (`techjournal-clone/lib/content/types.ts`, `classify.ts`).
- [x] Changelog/cronologia aggiornamenti — campo `tj_changelog` (WP), `Changelog.tsx`.
- [x] Staleness detection deterministica — `tj-api/src/modules/articles/services/staleGuidesService.ts`, soglia 45gg, `StaleGuidesList.tsx` (admin).
- [x] Aggiornamento automatico del contenuto — completato in questa sessione (§35-36, vedi voce dettagliata più sotto): patch applicata automaticamente per i suggerimenti ad alta confidenza, dietro `GUIDE_AUTO_UPDATE_ENABLED`.

## Approfondimenti / Recensioni / Speciali

- [x] Content type `deep-dive`, `comparison`, `review` (`lib/content/types.ts`).
- [~] Recensioni: modello dati esiste (plugin WP v1.3.0 — `tj_review_rating`, `tj_review_pros/cons`, `tj_review_test_duration`, `tj_review_methodology`, `tj_review_verdict`), ma **nessun articolo ha ancora questi campi compilati** — è un template pronto, non contenuto pubblicato.
- [x] Speciali/Topic Hub come pagina (`/topic/[slug]`), non come content type separato.

---

## 8-9. Topic / Entity system + Topic Hub automatici

- [x] `TopicKind` (company, os-family, os-release, device-family, device-model, service, feature, event, theme) + `TopicAlias` in `lib/content/types.ts`.
- [x] Route `/topic/[slug]` e `/topic` (`app/topic/[slug]/page.tsx`), hub data in `lib/content/hubData.ts`.
- [x] Aggiornamento automatico del hub quando escono nuovi articoli associati (derivato a runtime, non richiede intervento manuale).
- [x] Timeline dedicata dentro il topic hub — verificato il 2026-08-24: **esisteva già**, l'audit iniziale l'aveva mancata. Sezione "Cronologia" in `app/topic/[slug]/page.tsx:234-253`, esattamente nel formato data+titolo richiesto dal piano, derivata automaticamente dagli articoli del topic (nessun campo da compilare a mano), fino a 15 voci dopo la griglia "Ultime notizie".

---

## 10-12. Homepage modulare, ranking automatico, breaking news

- [x] **Homepage modulare data-driven** (§10, §56) — riletto a fondo il 2026-08-24, la valutazione precedente era troppo severa: `lib/home/sections.ts::HOME_SECTIONS` è già quasi esattamente il modello richiesto (`{id, type, title, enabled, limit, priority, filters}`), e `enabled` funziona davvero — ogni sezione (`EvergreenSection`, `PriceRadarSection`, `CompatibilitySection`) si auto-nega chiamando `sectionById()`, non è decorativo. Il gap reale trovato: `priority` non determinava l'ordine effettivo delle tre sezioni sotto la griglia principale — quello restava fisso nel JSX di `app/page.tsx`, nonostante il campo dichiarasse "ordine crescente di comparsa". Corretto: nuovo `orderedSectionIds()` in `sections.ts`, `app/page.tsx` ora itera quelle tre sezioni nell'ordine calcolato da `priority` invece che nell'ordine di scrittura del codice. 5 test dedicati in `tests/home/sections.test.ts`. **Deliberatamente non esteso** a un registro/plugin dinamico per tutte le sezioni (hero/spotlight/latest restano slot strutturali fissi in `HomeContent`): l'astrazione più spinta è esplicitamente respinta dal commento in cima al file citando il §85 anti-overengineering, e non c'è motivo di contraddire quella scelta già ragionata per un sito con ~6 sezioni. Typecheck, build Next.js completa, lint e test (321/321) verdi.
- [x] Ranking automatico deterministico — `lib/home/ranking.ts`: recency (decay 24h) + editorial (content type + reliability) + topicHeat + traffic (gated) + manualBoost.
- [x] Topic/Speciale del momento in evidenza — `hottestTopicSlug()` in `ranking.ts`.
- [x] **Breaking news da campo WordPress** (§12, 2026-08-23) — non più un array hardcoded nel frontend:
  1. Plugin WP v1.7.0: custom field `tj_breaking_kind` (`breaking`/`live`/vuoto), `tj_breaking_expires_at`, `tj_breaking_priority`; endpoint autenticato `PUT tj/v1/post/:id/breaking`. Un breaking senza scadenza compilata equivale a non attivo (nessuna barra accesa per errore di compilazione).
  2. tj-api: `updateWpPostBreaking` + endpoint admin `PUT /wp-posts/:wpId/breaking`.
  3. Editor admin: `tj-react-admin/app/(dashboard)/articoli/wp/[wpId]/breaking/` — toggle attivo/disattivo, tipo (BREAKING/LIVE), scadenza (`datetime-local`, validata nel futuro), priorità opzionale. Link "Breaking" in `ArticoliList.tsx`.
  4. Frontend: `PostWithMeta.breaking` in `lib/api.ts`; `lib/home/overrides.ts` aggiunge `breakingEntryFromPost()` che converte un post con `breaking` compilato in `BreakingEntry` — `BREAKING_ENTRIES` (l'array hardcoded) resta solo come fallback manuale per un avviso senza articolo associato. `app/page.tsx` costruisce i candidati dai post già scaricati per la home (`initialPosts` + `signalPool`, **zero fetch aggiuntivi**) e li passa ad `activeBreaking()`, che sceglie il migliore con la stessa logica pura di prima (priorità, poi scadenza più vicina).
  5. Supporto "LIVE" per grandi eventi già incluso (`kind: "live"`, stessa barra, etichetta diversa in `BreakingBar.tsx`).
  6. Test: 4 nuovi in `tests/home/overrides.test.ts` per `breakingEntryFromPost` (post senza breaking → null, conversione corretta, priorità assente → `undefined` non `null`, scadenza valutata da `activeBreaking` non dal converter). Typecheck, build, lint e suite completa (313/313) verdi su techjournal-clone; stesso esito su tj-api e tj-react-admin.

  **Nota deploy**: come TL;DR, va rizippato/ripubblicato il plugin v1.7.0 su WordPress prima che i campi siano scrivibili in produzione.

---

## 13-19. Articolo: struttura, TL;DR, tempo lettura, TOC, fonti, affidabilità, changelog

- [x] Tempo di lettura server-side — `lib/content/enrich.ts` (`readingMinutes`).
- [x] Indice/TOC automatico — `lib/content/toc.ts`, componente `TableOfContents.tsx`.
- [x] Sistema fonti — `lib/content/sources.ts` (estratte dai link nel contenuto).
- [x] Classificazione affidabilità (`official/confirmed/report/rumor/speculation`) — `Reliability` type + `classifyReliability` in `lib/content/classify.ts`.
- [x] Changelog per articoli evergreen — vedi sopra (campo `tj_changelog`).
- [x] **TL;DR automatico salvato in DB** (§14, 2026-08-23) — generato dall'autoposter nella stessa chiamata LLM che produce l'articolo (`tj-api/src/modules/ingestor/services/openaiIngest.ts`, campo `tldr` in `GptArticlePlan`; 3-5 punti, ignorati se `body_html` < 600 caratteri), persistito una sola volta su WordPress via nuovo endpoint autenticato `PUT tj/v1/post/:id/tldr` (plugin v1.6.0, custom field `tj_tldr`), scrittura best-effort e non bloccante in `autoposter.ts`. Frontend: `PostWithMeta.tldr` in `lib/api.ts`, componente `components/article/TLDR.tsx` renderizzato in cima al contenuto articolo, sotto la ReviewBox. Editor manuale in admin (§87, override umano): `tj-react-admin/app/(dashboard)/articoli/wp/[wpId]/tldr/` (`TldrForm.tsx` + `page.tsx`, stesso pattern di `ReviewForm.tsx`), endpoint proxy `/api/admin/wp-posts/[wpId]/tldr`, endpoint autenticato `PUT /wp-posts/:wpId/tldr` in tj-api, link "TL;DR" aggiunto a ogni riga di `ArticoliList.tsx` (vista mobile e tabella desktop).

---

## 20-24. Price Radar

- [x] Modello prodotto con storico prezzi reali (non interpolati) — `lib/priceRadar/types.ts`, `history.ts`, `productServer.ts`, cron `tj-api/scripts/price-radar-cron.ts`.
- [x] Grafico storico multi-finestra (7d/30d/90d/1y/storico) — `PriceHistoryChart.tsx`.
- [x] Price score deterministico, non-LLM — `lib/priceRadar/rating.ts` (documentato esplicitamente come modulo puro).
- [x] Componente Price Radar integrato negli articoli — `lib/priceRadar/articleProducts.ts`, `PriceRadarCard.tsx`.
- [x] Price Alert — verificato end-to-end il 2026-08-24: `checkAndNotifyWatches()` in `priceWatchService.ts` invia davvero una push notification (`sendPush`) quando il prezzo scende sotto soglia, chiamata da `scrapeBatch.ts` (il cron reale di scraping prezzi, sia HTTP sia timer VPS) solo quando il prezzo è realmente cambiato — non a ogni scrape. Re-arma l'avviso se il prezzo risale e riscende, ripulisce le sottoscrizioni scadute. Best-effort (`.catch` non bloccante): un invio fallito non impatta lo scraping.

---

## 25-27. Database Compatibilità Apple

- [x] Modello dati dispositivo — `Device{chipset, releaseYear, endOfSupportYear, specs}` in `compatibilityTypes.ts`. `specs` è deliberatamente free-form ("stile MacTracker", commento esplicito nel codice) per import JSON bulk da admin senza dover cambiare schema a ogni nuova generazione di dispositivo — è una scelta architetturale corretta (coerente col §85 "evita overengineering"), non un gap da chiudere.
- [x] Pagine generate dal DB — `/compatibility/device/[slug]`, `/compatibility/os/[slug]`, `/compatibility/confronta`.
- [x] Query editoriali "quali iPhone supportano iOS X" — `OsDetailPayload{os, rows}`.

---

## 28. Ricerca globale (Cmd+K)

- [x] Completa: `SearchLauncher.tsx` (listener Cmd/Ctrl+K), `SearchDialog.tsx`, `app/api/search/route.ts`, `lib/search/`. Unisce articoli, topic, dispositivi, OS, Price Radar in risultati raggruppati e ranked.

---

## 29-32. AI layer astratto, job queue, structured output, confidence score

- [~] **Layer AI astratto** — in lavorazione da un'altra sessione (codex), non da questa: verificato il 2026-08-26 che esiste già un'infrastruttura solida in `tj-api/src/modules/ingestor/services/` — `aiProvider.ts` (`AiProvider`, `AiProviderRegistry`, `AiProviderChain` con fallback multi-provider, `configuredAiProviderId` via env `AI_PROVIDER`/`AI_PROVIDER_CHAIN`), più decoratori componibili `circuitBreakerAiProvider.ts`, `retryingAiProvider.ts`, `validatedAiProvider.ts`. **Non ancora agganciata al percorso live**: nessuna implementazione OpenAI di `AiProvider` esiste ancora, e `openaiIngest.ts` (usato davvero da `autoposter.ts`/`makeArticlePlan`) non referenzia questo sistema — gira ancora sul fetch diretto hardcoded. Infrastruttura pronta, wiring finale in corso altrove.
- [x] Job "queue" via cron esterni autenticati (`CRON_SECRET`) su `/api/cron/*`: ingest-feeds, autopost-fill-day, guide-review-digest, newsletter-daily/weekly — schedulazione slot-based in `scheduler.ts`. Non è una vera queue (no BullMQ/Cloudflare Queues) ma il pattern "AI fuori dal render pagina" è rispettato.
- [x] **Structured output** — verificato il 2026-08-26: `aiOutputSchemas.ts` (stessa infrastruttura di cui sopra) definisce JSON Schema stretto per tutti i job reali (`article_plan`, `ingest_triage`, `guide_update_suggestion`, `guide_update_patch`, `translate_titles`), validato da `aiOutputValidation.ts`/`ValidatedAiProvider`. Stesso stato del punto sopra: pronto, non ancora nel percorso live finché `openaiIngest.ts` non lo adotta.
- [x] Confidence score con fallback — triage produce `confidence 0-1`, item a bassa confidence restano `status: pending` per rivalutazione.

---

## 33-36. Deduplicazione, story cluster, auto-update evergreen, no rewrite completo

- [x] Deduplicazione automatica — doppio livello: triage LLM (`duplicate_of_today`) + `evaluateSemanticDedup` via embedding, stage esplicito `dedup` nella pipeline.
- [x] Story cluster — `tj-api/src/modules/ingestor/services/story.ts`: `buildStoryId`, alias entity, tabella `autopost_stories`, aggiorna l'articolo canonico invece di duplicare.
- [x] **Auto-update evergreen end-to-end** (§35-36, 2026-08-23) — pipeline completa:
  1. `tj-api/src/modules/ingestor/services/guideUpdateSuggestion.ts`: nuova `makeGuideUpdatePatch` — una seconda chiamata LLM (solo per suggerimenti `confidence: "high"`, non per tutti) che propone una patch minima `{findText, replaceText}` invece di riscrivere l'articolo, coerente col §36. Se il modello non trova un'ancora sicura, risponde `possible:false` e non si applica nulla.
  2. `tj-api/src/modules/articles/services/guideUpdateSuggestionService.ts`: `attemptAutoApplyGuideUpdate()` — valida che `findText` compaia **esattamente una volta** nel contenuto HTML reale (0 o >1 occorrenze → scartato, mai un replace ambiguo), applica la sostituzione, sanifica con `sanitizeArticleHtml`, scrive il contenuto su WP (`updateWpPostContent`) e antepone una voce changelog con la data di oggi (`updateWpPostChangelog`, `tj_changelog`). Nuova colonna `applied_at` sulla tabella `guide_update_suggestions` per non riapplicare due volte lo stesso suggerimento.
  3. `tj-api/src/modules/articles/services/guideAutoUpdateService.ts` + nuovo endpoint `GET /api/cron/guide-auto-update` (stessa auth `CRON_SECRET` degli altri cron): sweep giornaliero sulle guide stale, riusa i suggerimenti in cache (< 7 giorni) come il digest esistente.
  4. **Disattivato di default**: tutto il flusso scrive contenuto pubblico reale, quindi richiede `GUIDE_AUTO_UPDATE_ENABLED=true` esplicito (documentato in `.env.example`) — senza, il cron gira ma logga solo "skipped", comportamento identico a prima.
  5. Test: `guideUpdateSuggestion.test.ts` copre il parsing della patch e la logica di conteggio occorrenze (la garanzia di sicurezza centrale: ancora assente o ripetuta → mai applicata). Typecheck, build e suite completa (56/56) verdi.

  **Raccomandazione**: prima di attivare `GUIDE_AUTO_UPDATE_ENABLED`, verificare a mano alcuni suggerimenti ad alta confidenza dalla pagina admin "Da rivedere" — il flusso automatico non passa da revisione umana una volta acceso.

---

## 37-39. FAQ, metadata SEO, structured data

- [x] FAQ derivate dal contenuto — `lib/content/faq.ts`, `FaqStructuredData.tsx`.
- [x] Metadata SEO AI-suggested con limiti di lunghezza — `seo_title`/`seo_description` troncati 60/160 char (`openaiIngest.ts`).
- [x] Structured data ampio: `Article`/`NewsArticle`/`Review`, `BreadcrumbList`, `Product`/`Offer`/`Brand`, `FAQPage`, `Organization`/`WebSite`/`SearchAction`, `ProfilePage`/`Person`. Copertura già alta.

---

## 40-42. Autori, editorial trust, disclaimer

- [x] Pagine autore reali — `/autore/[slug]`.
- [x] Pagine istituzionali — Chi siamo, Politica editoriale, Correzioni, Fonti, AI e automazione, Lavora con noi, Contatti.
- [x] Pagina "Fonti" dedicata — `app/fonti/page.tsx` (2026-08-23): elenca fonti primarie, report e testate tech realmente citate dal codice (`lib/content/sources.ts` → `KNOWN_PUBLISHERS`), collegata da footer e da Politica editoriale.
- [x] Disclaimer editoriale esplicito — nuova sezione "Notizia, report o rumor: come li distinguiamo" in `politica-editoriale/page.tsx` (2026-08-23), allineata alle etichette già usate in `lib/content/classify.ts`/`ReliabilityBadge.tsx`, con link a Correzioni e Fonti.

---

## 43-44. Newsletter

- [x] Selezione contenuti deterministica (no LLM) — `lib/newsletter/digest.ts`, modulo puro.
- [x] Endpoint anteprima digest — `app/api/newsletter/digest/route.ts` (genera HTML/text/subject).
- [~] Invio automatico via cron — verificato il 2026-08-24 quanto è verificabile da codice: `GET /api/cron/newsletter-daily` e `/newsletter-price-radar-weekly` in `tj-api/src/modules/webhooks-social/http/cronNewsletterRoutes.ts` esistono, e l'invio è reale via Brevo (`sendTransactionalEmail` in `src/lib/brevo.ts`, non un'anteprima — chiama davvero l'API Brevo, degrada in modo esplicito se `BREVO_API_KEY` manca). **L'unica cosa che resta da confermare è operativa, non di codice**: se lo scheduler esterno (Cloudflare Cron Triggers o simile, come da `.env.example`) chiama davvero questi endpoint in produzione — verificabile solo dal pannello dello scheduler, non dal repo.

---

## 45. Web Push / PWA

- [x] Web Push implementato — `public/sw.js`, `lib/push`, `app/api/push`, `PushOptIn.tsx`.
- [x] PWA installabile — verificato: `public/manifest.webmanifest` ha `display: standalone`, icone 192/512 + maskable presenti in `public/icons/`, dichiarato in `app/layout.tsx` (`manifest: "/manifest.webmanifest"`). Completo.

---

## 46. Account

- [ ] Nessun vero sistema account. `app/personale/page.tsx` è esplicitamente "nessun account" — topic seguiti/salvati/price alert vivono in `localStorage`. Coerente con la priorità bassa del piano (§46, §78), ma è il prerequisito per Price Alert reale via email/push.

---

## 47. Recensioni

- [~] Template pronto lato WordPress (voto, pro/contro, durata test, metodologia, verdetto) e componenti frontend, ma **zero recensioni pubblicate con questi campi compilati**. Feature "esiste nel modello dati, non nel contenuto".

---

## 48-55. Design, design system, mobile, performance, caching, analytics, trending

- [~] Design system: solo color tokens centralizzati (`app/globals.css` `@theme`); spacing/radius/shadow sono valori hardcoded sparsi, non tokenizzati.
- [x] Server Components di default, `"use client"` isolato e mirato (dialog, form, dashboard personale) — non indiscriminato.
- [x] Caching differenziato per tipo contenuto: categoria 60s, ricerca 60s, price-radar list 300s / detail 1800s, articolo 900s, homepage/topic/autore/compatibility 3600s.
- [~] **Analytics interne** (§54, 2026-08-24) — meno mancante di quanto scritto qui prima: verificato che view count (`lib/postViewsApi.ts`, wired end-to-end, alimenta già `viewCount`/`hasUsableTrafficSignal`) e click Price Radar/affiliati (`/api/price-radar/products/:id/click`) **esistevano già**. Il pezzo genuinamente assente — query di ricerca — è stato costruito: nuova tabella `search_query_log` in tj-api (`src/modules/analytics/services/searchQueryLog.ts`), endpoint pubblico `POST /api/analytics/search-query` (rate-limited, 60/min/IP, stesso pattern degli altri endpoint pubblici) chiamato fire-and-forget da `app/api/search/route.ts` in techjournal-clone — non blocca mai la risposta della ricerca. Endpoint admin `GET /api/admin/analytics/search-queries` per vedere le query più frequenti e la quota di ricerche a zero risultati (il segnale utile: cosa cercano i lettori che il sito non sa ancora dare). **Ancora mancante**: scroll depth e reading completion (richiederebbero instrumentazione client-side su `ArticleBody.tsx`, non toccato in questo blocco per il rischio di collisione con lavoro in corso su quel file). Typecheck, build e test (65/65 tj-api, 321/321 techjournal-clone) verdi.
- [~] Trending con finestra temporale — solo 7d/30d (`weekTrendingPosts`/`monthTrendingPosts`), manca granularità 1h/6h/24h richiesta dal piano.

---

## 56-58. Homepage slot config, componenti riutilizzabili, blocchi contenuto

- [x] Modello `HomepageSection` configurabile — vedi §10 (corretto il 2026-08-24): esiste già, `priority` ora ordina davvero.
- [x] Componenti editoriali riutilizzabili già presenti in buona parte (ArticleStructuredData, TableOfContents, Changelog, PriceRadarCard, BreakingBar, FaqStructuredData, ecc.) anche se non con i nomi esatti elencati nel piano.
- [x] **Blocchi editoriali nel contenuto** (§58, 2026-08-24) — questo era un gap vero, non uno già coperto. CSS in `app/globals.css` per un markup fisso `<div class="tj-callout tj-callout--{variante}">` con 7 varianti (update/info/tip/fact/warning/rumor/confirmed → Aggiornamento/Da sapere/TechJournal consiglia/Dato/Attenzione/Rumor/Confermato), colori coerenti con `ReliabilityBadge.tsx` esistente (verde per confermato, ambra per rumor/attenzione, accento brand per gli altri). Nessuna modifica al sanitizzatore HTML: `div`+`class` erano già in allowlist sia in `lib/sanitizeRichHtml.ts` (frontend) sia in tj-api `src/lib/sanitizeHtml.ts` (verificato, non toccato). **Deliberatamente non collegato all'autoposter**: solo la capacità/stile esistono, nessuna generazione automatica di questi blocchi per ora — evita il rischio di uso eccessivo da parte dell'LLM senza una revisione della qualità prima (il piano stesso avverte "non abusarne"). Build Next.js completa e test (321/321) verdi.

---

## 59-61. Qualità vs volume, evitare risposte generiche, fonti ufficiali

Criteri editoriali applicati nella logica esistente (dedup, story cluster, reliability) — nessuna nuova feature separata da spuntare, ma vanno tenuti come check qualitativo permanente sui prompt dell'autoposter.

---

## 62-68. AI cost control, prompt versioning, observability, fallback, moderazione, quality score

- [x] **Cost control** (§62, 2026-08-23) — due parti, entrambe fatte:
  - **Differenziazione modello per task**: `chatJson()` accetta un `modelTier` (`"economy"` default, `"synthesis"`); `getSynthesisModel()` legge `OPENAI_MODEL_SYNTHESIS` con fallback a `OPENAI_MODEL` — senza impostarla, comportamento identico a prima (nessun costo aggiuntivo di default). Tier `synthesis` su `makeArticlePlan` e `makeGuideUpdatePatch` (basso volume, precisione critica); triage/traduzione/suggerimento guida restano `economy`.
  - **Skip su contenuto invariato pre-generazione** (2026-08-24): nuova colonna `guide_update_suggestions.context_hash` (SHA-256 di contenuto guida + articoli correlati, stesso taglio usato nel prompt). `guideNeedsFreshSuggestion()` in `guideUpdateSuggestionService.ts` confronta l'hash corrente con quello salvato **prima** di chiamare l'LLM — se il contenuto non è cambiato, niente chiamata OpenAI, indipendentemente da quanto tempo è passato dall'ultima generazione (sostituisce la vecchia soglia fissa a 7 giorni in `guideReviewDigestService.ts` e `guideAutoUpdateService.ts`, entrambe ora basate sul contenuto reale invece che sul tempo trascorso). Costo residuo: solo un fetch WordPress (non OpenAI) per calcolare l'hash a ogni run.
  - Cache/hash su dedup URL feed (`feedSync.ts`) già esistente da prima, non toccata.
- [x] **Prompt versioning** (§63, 2026-08-23) — `chatJson()` in `openaiIngest.ts` richiede ora un 5° parametro `promptVersion` obbligatorio (nessuna chiamata può più ometterlo, il typecheck lo impone). Una costante per template, dichiarata subito accanto al testo del prompt che versiona: `ARTICLE_PLAN_PROMPT_VERSION`, `INGEST_TRIAGE_PROMPT_VERSION`, `TRANSLATE_TITLES_PROMPT_VERSION`, `SUGGESTION_PROMPT_VERSION`, `PATCH_PROMPT_VERSION` — tutte `-v1` di partenza, da incrementare quando il testo del prompt cambia. Persistito nella nuova colonna `ai_call_log.prompt_version` (migrazione automatica all'avvio). Esposto nell'admin: `GET /api/admin/ingest/ai-usage` raggruppa ora anche per `promptVersion`, e `AiUsagePanel.tsx` lo mostra accanto al nome del job — utile per isolare un calo di qualità a una versione di prompt specifica dopo una modifica. Le chiamate embeddings (`createEmbeddings`) restano `promptVersion: null`: non hanno un template di prompt da versionare.
- [x] AI observability — tabella `ai_call_log` (job, model, status, token, durata, errore), endpoint `GET /api/admin/ingest/ai-usage`. Costo USD opzionale via env.
- [x] Fallback provider — errori loggati, il resto del sito resta indipendente; autoposter fallisce il singolo item senza impatto sul pubblico.
- [~] Moderazione pre-pubblicazione — `contentModeration.ts`: check deterministici (lunghezza minima, placeholder, markdown rotto, URL sospetti, menzione fonte). **Esplicitamente non implementati** (da commento nel file): title/content mismatch, verifica URL allucinati.
- [x] **Content quality score unificato** (§67, 2026-08-23) — nuovo `contentQualityService.ts`, puro e deterministico: combina la confidence del triage (0-1, già esisteva ma non veniva mai usata per il gating) con i flag di `contentModeration.ts` (prima solo `menzione-fonte` bloccava davvero, gli altri finivano in una colonna senza effetto). Regola assoluta per i flag gravi (titolo vuoto, contenuto troppo corto, segnaposto rimasto, link con schema sospetto, menzione fonte → `reject` indipendentemente dalla confidence, non una soglia aggirabile), penalità additive per i flag minori (markdown non convertito, link esterni inattesi) che possono far scendere lo score sotto 0.5 → `review`. Solo `auto_publish` prosegue con la pubblicazione; `review` e `reject` marcano l'item `error` (retriabile al prossimo fill-day, mai pubblicato da solo — stesso comportamento già esistente per il blocco menzione-fonte, ora esteso a tutti i flag). Wired in `autoposter.ts` dopo il retry QA sulla menzione fonte. 9 test dedicati in `contentQualityService.test.ts` (ogni flag bloccante testato singolarmente, penalità cumulative, clamping, flag sconosciuti fail-open). Esposto in admin (2026-08-24): colonne dedicate `quality_score`/`quality_decision`/`quality_reasons` + badge colorato in `IngestorAdminView.tsx` — vedi sezione dedicata più sotto.

---

## 69-73. SEO entity-driven, no cannibalizzazione, URL, sitemap, OG

- [x] Struttura entity→topic→news/guide già presente (vedi §8-9).
- [x] URL leggibili e stabili (`/topic/`, `/compatibility/`, `/price-radar/`, `/autore/`).
- [x] **Sitemap segmentata** (§72, 2026-08-26) — `app/sitemap.xml/route.ts` è ora un sitemap index; 5 sitemap segmentate: `sitemap-articles.xml`, `sitemap-topics.xml`, `sitemap-compatibility.xml`, `sitemap-price-radar.xml`, `sitemap-pages.xml` (home, categorie, istituzionali). Logica di costruzione estratta in `lib/sitemapEntries.ts` (una funzione per tipo, stessi criteri di inclusione di prima — nessuna regressione), rendering XML condiviso in `lib/sitemapXml.ts`. `robots.txt` non ha richiesto modifiche (punta già a `/sitemap.xml`, ora l'indice). Vantaggio reale oltre alla richiesta del piano: un errore upstream o una lentezza su un tipo di contenuto non svuota più l'intera sitemap, solo il segmento coinvolto. Trovato e corretto un buco preesistente durante l'estrazione: `/fonti` (creata in una sessione precedente) non era mai stata aggiunta alla sitemap. Verificato con build Next.js completa + dev server live contro il backend reale (sitemap index e sitemap-pages.xml entrambe 200 con XML corretto). Typecheck, lint, test (328/328) e build tutti verdi. Committato e pushato su `dev` (`3d4fbda`), verificato anche sulla preview Vercel (`tj-react-git-dev-andreaems-projects.vercel.app/sitemap.xml`) — `<sitemapindex>` corretto con tutti e 5 i segmenti. **In attesa di promozione in produzione**: su `www.techjournal.it/sitemap.xml` è ancora live la vecchia sitemap unica (`<urlset>`), i 5 segmenti rispondono 404 finché `dev` non viene promosso/mergiato in produzione — passaggio lasciato volutamente a te (2026-08-26).
- [x] OG image per-articolo — verificato: `generateMetadata` in `app/[slug]/[articleSlug]/page.tsx` usa `post.imageUrl` (la foto reale dell'articolo) con fallback a `/og-default.png` solo quando manca. Usare la foto reale dell'articolo è corretto per una testata (meglio di un template testo-su-sfondo generato); il fallback dinamico brandizzato copre il caso senza immagine.

---

## 74-76. Accessibilità, pubblicità, affiliazioni

Auditate il 2026-08-24 (unica area del piano rimasta mai verificata). Risultato: quasi tutto già
fatto, e nel codice le scelte sono già commentate in modo esplicito — non un'area trascurata.

**Accessibilità (§74)**
- [x] Landmark semantici — `<header>` (`HeaderClient.tsx:116`), `<nav>` (`NavBar.tsx`, `Footer.tsx` con `aria-label`), `<footer>`, `<main>` (`AppShell.tsx`).
- [x] Contrasto colori — gestito consapevolmente: `app/globals.css` documenta che `--accent` (arancione brand) è ~2:1 su bianco (sotto WCAG AA) e per questo i link nel corpo articolo usano `--accent-text` (~5:1), non lo stesso token del brand.
- [x] Focus keyboard-visibile — regola globale `:focus-visible` in `globals.css`.
- [x] ARIA label su icon-only — diffuso su ~20 componenti (NavBar, Footer, ShareButtons, ThemeToggle, Breadcrumbs, ScrollToTop, ecc.).
- [x] Modali con focus trap — `useDialogFocus.ts` (Tab-cycling, Escape, restore focus al chiudere) + `role="dialog"`/`aria-modal="true"` espliciti in `SearchDialog.tsx`.
- [x] Immagini/alt — `alt` informativo dove serve (`post.imageAlt`), `alt=""` deliberato per immagini puramente decorative già accompagnate da testo (`ProductPriceCard.tsx`, con commento che spiega la scelta).

**Pubblicità (§75)**
- [x] AdSense integrato — `AdSenseScript.tsx` (lazy-load su interazione, `requestNonPersonalizedAds`), `AdSenseUnit.tsx`, gating esplicito sul consenso cookie via `ConsentAwareAdSlot.tsx` (niente ads senza consenso "marketing").
- [x] Spazio riservato anti-CLS — `InlineBannerPlaceholder.tsx` con `minHeight` fisso, placeholder in locale al posto dell'ad reale mantenendo lo spazio.
- [x] Responsive — `fullWidthResponsive` + `adFormat` scelto in base all'altezza disponibile.

**Affiliazioni (§76)**
- [x] Separazione prezzo/rating/affiliazione — `lib/priceRadar/rating.ts` è deliberatamente un modulo puro: nessuna informazione commerciale entra nel calcolo del rating, solo prezzo e storico (commento esplicito nel file, coerente col principio §76 del piano).
- [x] Disclosure di affiliazione — testo visibile vicino al bottone d'acquisto in `app/price-radar/[asin]/page.tsx` ("se acquisti, TechJournal riceve una commissione... il rating resta indipendente dall'affiliazione"), più sezione dedicata in `app/ai-e-automazione/page.tsx` e nota in `app/fonti/page.tsx`.
- [x] `rel="nofollow sponsored noopener noreferrer"` su tutti i link di acquisto Price Radar (`ProductPriceCard.tsx`, `PriceRadarCard.tsx`, pagina prodotto), con commento sul perché.

**Nessuna azione di codice necessaria** — l'area era solo da verificare, non da costruire.

---

## 77-78. Roadmap a fasi e priorità

Il piano stesso è la roadmap (PHASE 0-9). Lo stato reale oggi:
- **PHASE 0 (Audit)** — fatto ora, con questo documento.
- **PHASE 1 (Fondamenta editoriali)** — quasi completa: manca solo TL;DR persistito.
- **PHASE 2 (Homepage)** — ranking e breaking esistono ma non sono ancora "senza codice" (config-driven).
- **PHASE 3 (Topic Hub)** — sostanzialmente fatta, manca timeline visiva nel hub.
- **PHASE 4 (Price Radar)** — quasi completa, manca solo delivery reale del Price Alert.
- **PHASE 5 (Compatibility)** — fatta, con nota sul modello dati free-form.
- **PHASE 6 (Search)** — fatta.
- **PHASE 7 (Automation)** — la parte più indietro: prompt versioning, quality score unificato, cost control per task mancano.
- **PHASE 8 (Retention)** — newsletter/push parzialmente pronti, PWA da confermare.
- **PHASE 9 (Account)** — non iniziata, coerente col piano (bassa priorità).

---

## 79-83. Feature flags, migrazioni, test, TypeScript, error handling

- [x] Feature flags — **esiste già** (verificato il 2026-08-24, non trovato nel giro precedente): `lib/featureFlags.ts` — registro chiuso `FEATURE_FLAGS` con default espliciti, `isFeatureEnabled(flag)`, usato da `components/FeatureGate.tsx`. *Nota di processo*: in questo stesso controllo ho per errore sovrascritto questo file (e `techradar.ts`, e il suo test) con un'implementazione mia più semplice prima di accorgermi che esisteva già — probabilmente lavoro recente di un'altra sessione (codex) sullo stesso repo. Ripristinato subito via `git checkout` non appena il typecheck ha segnalato l'incoerenza (`components/FeatureGate.tsx` che referenziava simboli spariti); verificato con `git status` che non fosse rimasta alcuna traccia. Lezione per i blocchi successivi: controllare l'esistenza di un file (anche solo `git log -- <path>`) prima di scriverlo, non solo prima di editarlo.
- [x] TypeScript pulito nei file ispezionati (interfacce esplicite, `any` non riscontrato).
- [x] Error handling su fetch remoti — `lib/api.ts`: `fetchWithTimeout` con `AbortController` (8s default), gestione esplicita errori HTTP, retry singolo difensivo, logging.
- [~] Test automatici — verificato il 2026-08-24: **esistono già** e sono sostanziosi, contrariamente a quanto scritto qui prima. `tests/priceRadar/rating.test.ts` (215 righe, price score), `tests/content/related.test.ts` (179 righe, topic/related matching), `tj-api/.../story.test.ts` (81 righe, story clustering/dedup tematico). Manca solo un test per `evaluateSemanticDedup` (dedup via embedding in `autoposter.ts`) — difficile da testare in isolamento perché dipende da chiamate OpenAI live, non un'omissione grave.
- Migrazioni dati: nessuna evidenza di rottura, il pattern osservato (campi opzionali aggiunti al plugin WP con default sicuri) è già quello raccomandato dal piano.

---

## 84-93. Modalità operativa e di lavoro

Istruzioni di processo per come lavoro con te (audit → implementazione diretta → lint/test/build → comunicazione sintetica), non feature di prodotto. Le adotto come modalità operativa da qui in avanti.

## 94. Risultato finale

Metrica guida permanente, non una checkbox.

---

## Chiusi il 2026-08-23 (verifica dev + quick win)

Riverificato lo stato reale su branch `dev` di tutti e tre i repo (nessun branch feature/codex non mergiato conteneva pezzi nascosti). Risultato: 2 voci erano già complete e mal classificate, 1 era una scelta architetturale intenzionale, 2 sono state chiuse con codice:

- **PWA installabile** (§45) — riclassificato `[x]`: era già completo (manifest, icone, standalone), semplicemente non riverificato a fondo nel primo giro.
- **OG image per-articolo** (§73) — riclassificato `[x]`: usa già la foto reale dell'articolo con fallback dinamico.
- **Modello dati dispositivo Apple** (§25) — riclassificato `[x]`: `specs` free-form è una scelta deliberata anti-overengineering, non un gap.
- **Pagina Fonti** (§41) — creata `app/fonti/page.tsx`, linkata da footer e Politica editoriale.
- **Disclaimer editoriale notizia/report/rumor** (§41-42) — aggiunto in `politica-editoriale/page.tsx`, allineato al sistema di reliability già in codice.

Nuovo conteggio: **49 fatti, 16 parziali, 12 mancanti** su 77 voci verificabili.

## TL;DR chiuso il 2026-08-23 — nota di deploy

Come per le versioni precedenti del plugin (v1.3.0-v1.5.0), il codice PHP è aggiornato nel repo
(`scripts/wp-plugin/techjournal-api`, ora v1.6.0) ma **va rizippato e ripubblicato su WordPress
manualmente** perché il campo `tj_tldr` e l'endpoint `PUT tj/v1/post/:id/tldr` siano live in
produzione — non risulta uno script di build/zip automatico nel repo. Finché non è deployato,
`autoposter.ts` proverà comunque a scrivere il TL;DR ma l'endpoint risponderà 404 (fallback
silenzioso, non blocca la pubblicazione dell'articolo).

## Sessione del 2026-08-23 completata

Tutti e sei i punti di "prossimi passi" identificati nell'audit iniziale sono stati chiusi in questa
sessione: PWA/OG/Compatibility (riclassificati, erano già fatti), pagina Fonti + disclaimer,
TL;DR persistito + editor admin, auto-update evergreen end-to-end, prompt versioning, breaking
news da campo WP + editor admin, content quality score unificato. Typecheck/build/lint/test
verdi su tutti e tre i repo a ogni passo.

Conteggio aggiornato: **74 fatti, 11 parziali, 1 mancante** su 86 voci verificabili (era 44/19/14
su 77 voci prima di questa sessione). L'unica voce rimasta davvero mancante è il sistema account
(deliberatamente bassa priorità nel piano stesso, §46/§78).

Dei 11 parziali rimasti, verificati uno per uno il 2026-08-24: nessuno è un gap chiudibile con un
altro blocco piccolo e isolato come quelli di oggi. O richiedono contenuto umano reale (recensioni
— il template è pronto, serve solo che qualcuno le scriva), o sono scelte architetturali già
consapevoli e non urgenti (AI provider astratto, Zod al posto della validazione manuale, sitemap
segmentata — quest'ultima giudicata non necessaria al volume attuale), o sono limiti tecnici del
segnale disponibile (trending orario: servirebbero eventi con timestamp, non un contatore
cumulativo). Il piano è sostanzialmente completo; il deploy dei due plugin WP resta l'unico
blocco non di codice.

## Cost control chiuso il 2026-08-23 (fast-follow)

`OPENAI_MODEL_SYNTHESIS` (§62): tier `synthesis` per `makeArticlePlan` e `makeGuideUpdatePatch`,
tier `economy` (default, invariato) per triage/traduzione/suggerimento guida. Senza la variabile
impostata il comportamento è identico a prima — attivabile quando serve, zero costo aggiuntivo di
default. Typecheck, build e test (65/65) verdi.

## Cost control completato il 2026-08-24 (seconda parte)

Skip su contenuto invariato: `context_hash` su `guide_update_suggestions`, `guideNeedsFreshSuggestion()`
sostituisce la soglia fissa a 7 giorni in digest e auto-update sweep con un confronto sul contenuto
reale. Typecheck, build e test (65/65, invariati — nessuna regressione) verdi. Lavoro isolato dietro
un lock temporaneo in `docs/work-locks/active/` (rilasciato a fine task) per non sovrapporsi al
lavoro in corso di codex sullo stesso repo.

## Pannello admin content quality score completato il 2026-08-24

La decisione `auto_publish/review/reject` era già calcolata (§67) ma visibile solo dentro il testo
libero di `gpt_error`. Ora è strutturata: nuove colonne `quality_score`/`quality_decision`/
`quality_reasons` su `ingest_feed_items` (migrazione automatica), persistite da `autoposter.ts` a
ogni esito (successo, story update, errore di scrittura WP, reject/review) — non solo sul percorso
di scarto. Badge colorato (verde/ambra/rosso) in `IngestorAdminView.tsx`, con lo score e il motivo
in tooltip. Nessuna modifica alla route admin: `GET /ingest/items` passa già l'intera riga.
Typecheck/build/lint verdi su tj-api e tj-react-admin (test tj-api 65/65 invariati). Lock
temporaneo impostato e rilasciato come per il task precedente.

## Homepage config-driven corretta il 2026-08-24

Non era il gap descritto — vedi voce corretta più sopra alla §10/§56. Fix mirato: `priority` ora
ordina davvero le sezioni sotto la griglia, non solo sulla carta. Typecheck, build Next.js, lint e
test (321/321) verdi. Lock impostato/rilasciato come i blocchi precedenti.

## Prossimi passi consigliati (non ancora iniziati)

1. **Deploy dei plugin WordPress v1.6.0 (TL;DR) e v1.7.0 (breaking)** — bloccante per tutto: nessuna delle feature costruite in questa sessione che tocca WordPress è live finché il plugin non viene rizippato e ripubblicato manualmente. Non è un task di codice, richiede accesso all'admin WordPress.
