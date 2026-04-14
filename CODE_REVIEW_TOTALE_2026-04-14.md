# Code Review Totale - 2026-04-14

Repository analizzati:
- `techjournal-clone`
- `tj-api`
- `tj-react-admin`

Totale findings aperti: **0**.

## Completati (patch applicate)

- `tj-api/src/middleware/errorHandler.ts`: risposta 500 generica in produzione (niente leak `Error.message`).
- `tj-api/src/modules/price-radar/http/publicRoutes.ts`: risposta 500 generica in produzione sulle route pubbliche.
- `tj-react-admin/app/login/page.tsx`: sanitizzazione di `from` (hardening open redirect).
- `tj-react-admin/app/api/admin/wp-posts/route.ts`: aggiunto guard sessione (`401` se non autenticato).
- `tj-react-admin/app/api/admin/wp-posts/by-id/[wpId]/route.ts`: aggiunto guard sessione (`401` se non autenticato).
- `tj-react-admin/app/api/admin/articles/unified/route.ts`: aggiunto guard sessione (`401` se non autenticato).
- `tj-react-admin/app/api/admin/wp-categories/route.ts`: aggiunto guard sessione (`401` se non autenticato).
- `tj-react-admin/app/api/admin/articles/import-from-wp/route.ts`: aggiunto guard sessione (`401` se non autenticato).
- `techjournal-clone/lib/api.ts`: fix `totalPages` su categorie multiple.
- `techjournal-clone/lib/api.ts`: timeout centralizzato fetch SSR + limiti helper HTTPS (`timeout` + `max response bytes`).
- `techjournal-clone/lib/priceRadar/proxyTjApi.ts`: timeout upstream + `504` su abort.
- `techjournal-clone/components/HomeContent.tsx`: non disabilita piu `hasMore` su errore transitorio.
- `techjournal-clone/app/api/iubenda-embed/route.ts`: `encodeURIComponent` del parametro `i`.
- `techjournal-clone/components/HeaderClient.tsx`: rimosso `-ml-2` sull’hamburger mobile.
- `tj-react-admin/app/(dashboard)/articoli/ArticoloForm.tsx`: salvataggio bloccato se il caricamento iniziale fallisce (`loadFailed` + errore esplicito).
- `techjournal-clone/components/ArticleBody.tsx`: sanitizzazione HTML prima del render.
- `techjournal-clone/components/AuthorCard.tsx`: sanitizzazione HTML descrizione autore.
- `techjournal-clone/components/IubendaPolicyContent.tsx`: sanitizzazione HTML policy.
- `techjournal-clone/lib/sanitizeRichHtml.ts`: utility centralizzata per hardening `dangerouslySetInnerHTML`.
- `techjournal-clone/lib/tjApiProxy.ts`: rimozione forward di `Authorization` client -> upstream.
- `techjournal-clone/lib/tjApiProxy.ts`: `upstreamUrl` mostrato solo in ambiente non production.
- `tj-react-admin/lib/tjApiProxy.ts`: `upstreamUrl` mostrato solo in ambiente non production.
- `tj-api/src/modules/price-radar/auth/adminAuth.ts`: confronto bearer secret con `timingSafeEqual`.
- `tj-api/src/modules/webhooks-social/services/socialStatsService.ts`: `graph_message` ridotto in produzione.
- `tj-api/src/modules/ingestor/services/feedSync.ts`: hardening SSRF (blocco host/protocolli non consentiti e reti private/locali).
- `tj-api/src/modules/articles/services/articlesService.ts`: query batch `getExistingWpIds()` per evitare N+1.
- `tj-api/src/modules/articles/http/adminArticlesRoutes.ts`: rimosso N+1 su `/wp-posts` usando check batch.
- `tj-react-admin/components/AdminLogout.tsx`: logout robusto con gestione `res.ok` e feedback errore.
- `tj-react-admin/components/admin/ArticleHtmlEditor.tsx`: validazione URL link (`http/https` o path relativi).
- `tj-react-admin/app/(dashboard)/ingestor/IngestorAdminView.tsx`: separazione stato `error` e `notice` (successo non piu su stato errore).
- `techjournal-clone/app/api/megamenu/[slug]/route.ts`: cap cardinalita cache + eviction FIFO.
- `techjournal-clone/lib/tjApiProxy.ts`: limiti payload request/response per prevenire memory spike.
- `techjournal-clone/lib/priceRadar/proxyTjApi.ts`: limiti payload request/response per prevenire memory spike.
- `techjournal-clone/lib/constants.ts`: logging API solo in ambiente non production.
- `tj-react-admin/lib/tjApiProxy.ts`: logging request solo in ambiente non production.
- `techjournal-clone/lib/auth.ts`: rimozione funzioni auth inutilizzate (dead code).
- `tj-react-admin/lib/auth.ts`: rimozione funzioni auth inutilizzate (dead code).
- `tj-api/src/modules/auth-admin/services/authService.ts`: rimozione `getSessionFromToken` non usata.
- `techjournal-clone/lib/api.ts`: rimozione funzioni non usate (`fetchPostsWithEmbed`, `fetchTrendingByPeriod`).
- `techjournal-clone/components/PostListWithEmbed.tsx`: file non usato rimosso.
- `tj-react-admin/components/DashboardHeader.tsx`: nav mobile responsive con menu dedicato.
- `tj-react-admin/app/(dashboard)/AdminDashboardStats.tsx`: header/tab responsive su viewport mobile.
- `tj-react-admin/app/(dashboard)/layout.tsx`: padding responsive mobile (`px-4 sm:px-6`).
- `tj-react-admin/app/(dashboard)/articoli/ArticoliList.tsx`: vista card mobile alternativa alla tabella desktop.
- `tj-react-admin/app/(dashboard)/articoli/ArticoloForm.tsx`: media modal accessibile (`role=dialog`, `aria-modal`, Esc) e mobile-friendly (`92dvh`, sheet-like).

## Finding aperti

Nessun finding aperto.

## Codice morto evidenziato

Nessun codice morto residuo tra quelli tracciati nel report.

## Ottimizzazioni prioritarie

Le ottimizzazioni prioritarie tracciate in questo report sono state applicate.

## Bug funzionali principali

Nessun bug funzionale aperto tra quelli tracciati.

## Test mancanti ad alta priorita

1. Test policy errori: nessun dettaglio interno al client in produzione.
2. Test sanitizzazione HTML/URL con payload XSS.
3. Test timeout/fallback su proxy verso upstream.
4. Test regressione su flussi mobile aggiornati (header/dashboard/lista articoli/modale media).

## Piano remediation consigliato

Remediation completata per tutti i finding aperti del report.

## Approfondimento - Rischi blocco main process

Risolti nel perimetro del report:
- limiti payload request/response su proxy (`lib/tjApiProxy.ts`, `lib/priceRadar/proxyTjApi.ts`);
- cap cache megamenu con eviction (`app/api/megamenu/[slug]/route.ts`).

## Approfondimento - Verifica visual mobile (browser + static audit)

### Verifica browser reale (`techjournal-clone`)

Controllo effettuato in headless browser su:
- iPhone 12 (`390x844`)
- Galaxy S8 (`360x740`)
- pagine: `/`, `/apple`, `/apple/apple-testa-quattro-modelli-smart-glasses-materiali-fascia-alta`

Esito:
- Nessun overflow orizzontale critico rilevato.
- Nessun testo tagliato critico rilevato.
- bug hamburger mobile a bordo sinistro: **risolto** (rimozione `-ml-2` in `components/HeaderClient.tsx`).

### Audit statico mobile (`tj-react-admin`)

Fix applicati sui bug probabili tracciati:
1. `components/DashboardHeader.tsx`: nav mobile dedicata con menu responsive.
2. `app/(dashboard)/AdminDashboardStats.tsx`: header e tab responsive.
3. `app/(dashboard)/layout.tsx`: padding responsive.
4. `app/(dashboard)/articoli/ArticoliList.tsx`: card mobile dedicate.
5. `app/(dashboard)/articoli/ArticoloForm.tsx`: modal media mobile-friendly e accessibile.
