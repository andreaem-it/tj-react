# TechJournal — checklist lancio keynote 2026

Ultimo aggiornamento: 2026-08-26. Finestra obiettivo: 8–9 settembre 2026 (data Apple da confermare).

Questa checklist misura la prontezza al lancio, non sostituisce il Piano 94. Ogni blocco va chiuso con stato Git controllato, file propri aggiunti esplicitamente, test/typecheck/lint/build proporzionati, commit autonomo e push su `origin/dev`.

## Regole di esecuzione

- [ ] Non modificare né includere il lavoro non committato di Claude.
- [ ] Un solo obiettivo verificabile per commit.
- [ ] Nessuna promozione in produzione prima del gate finale esplicito.
- [ ] Annotare qui evidenze, commit e blocchi esterni man mano che vengono chiusi.

## P0 — Integrità del candidato al lancio

- [ ] Far completare e committare separatamente a Claude le sitemap segmentate già presenti nel worktree frontend.
- [ ] Riallineare questa checklist con il Piano 94 dopo la chiusura delle sitemap, senza sovrascrivere modifiche altrui.
- [x] Verificare che `dev` sia verde nei tre repository: test, TypeScript, ESLint dove configurato e build di produzione. Verificato il 2026-08-26: frontend 328 test + lint + typecheck + build Webpack; API 162 test + build TypeScript; admin lint + typecheck + build Webpack.
- [x] Preparare una matrice delle variabili necessarie per Preview e Production senza copiarne i valori nei log. Vedi `docs/DEPLOY-ENV-MATRIX.md`; audit dei soli nomi completato il 2026-08-26.
- [ ] Confermare backup, rollback e deployment precedente recuperabile per frontend, API e admin.

## P0 — WordPress e pipeline editoriale

- [ ] Verificare nell’admin WordPress che il plugin TechJournal API 1.7.0 sia installato e attivo.
- [ ] Verificare una scrittura autenticata reale di TL;DR e breaking tramite `tj-api`.
- [ ] Eseguire il percorso completo feed → AI → WordPress → frontend con un contenuto di prova controllato.
- [ ] Verificare attribuzione autore, changelog e campi recensione.
- [ ] Preparare e pubblicare almeno una recensione reale con metodologia, durata, voto, pro e contro.

## P0 — Lettura audio articoli

- [ ] Verificare credenziali Google Cloud TTS e accesso R2 nel deployment candidato.
- [ ] Verificare enqueue, worker, retry, persistenza segmenti e stato coda.
- [ ] Eseguire un backfill controllato di articoli rappresentativi e controllarne i costi.
- [ ] Collaudare player su Safari iPhone, Chrome Android e desktop: play/pausa, seek, velocità, ripresa e cambio segmento.
- [ ] Verificare accessibilità tastiera, screen reader, focus e target touch del player.
- [ ] Abilitare `ARTICLE_AUDIO_AUTO_ENQUEUE` solo dopo il collaudo del worker.
- [ ] Abilitare `FEATURE_ARTICLE_AUDIO` solo dopo disponibilità audio sufficiente.

## P0 — Scheduler e automazioni

- [ ] Confermare scheduler `ingest-feeds` ogni circa 10 minuti.
- [ ] Confermare scheduler `autopost-fill-day` giornaliero.
- [ ] Confermare scheduler `article-audio-worker` ogni minuto.
- [ ] Confermare scheduler newsletter giornaliera e Price Radar settimanale.
- [ ] Confermare scheduler guide review/auto-update e stato del relativo feature flag.
- [ ] Confermare timer VPS Price Radar oppure predisporre un sostituto monitorato.
- [ ] Verificare autenticazione `CRON_SECRET`, log dell’ultimo successo e alert sui fallimenti.

## P0 — Smoke test end-to-end

- [ ] Login/logout e durata sessione admin.
- [ ] Ingestor: feed, impostazioni AI, voce, elaborazione singola/batch e gestione errori.
- [ ] Articoli: creazione, modifica, TL;DR, breaking, revisione, media e pubblicazione.
- [ ] Frontend: homepage, categorie, articolo, topic hub, autore, ricerca e pagine istituzionali.
- [ ] Price Radar: catalogo, dettaglio, storico, proposta lettore, moderazione, modifica/eliminazione e batch manuale.
- [ ] Compatibility: dispositivi, sistemi operativi, matrice, confronto e import admin.
- [ ] Newsletter, Web Push, Price Alert e incremento visualizzazioni articolo.
- [ ] Sitemap, robots, feed RSS, metadata, JSON-LD e canonical.

## P1 — UI, accessibilità e responsive

- [ ] Audit visuale sistematico su 320, 375, 390, 430, 768, 1024, 1440 e 1920 px.
- [ ] Correggere overflow, wrapping, altezze, spaziature e target inferiori a 44×44 px.
- [ ] Verificare navigazione completa da tastiera, ordine focus, dialog e sidepanel.
- [ ] Verificare contrasto, zoom 200%, reduced motion e testi lunghi.
- [ ] Controllare in particolare homepage, articolo/player, ricerca, Price Radar, Compatibility e admin Ingestor.

## P1 — Performance e resilienza

- [ ] Misurare Core Web Vitals/Lighthouse sul deployment candidato per homepage e articolo.
- [ ] Verificare immagini responsive, font, CLS pubblicitario e bundle client.
- [ ] Verificare fallback e timeout con WordPress, `tj-api`, TTS, R2, OpenAI e Brevo indisponibili.
- [ ] Eseguire controllo runtime log/errori Vercel e definire soglie di allarme.
- [x] Verificare rate limiting e protezione degli endpoint pubblici mutanti. Audit completato il 2026-08-26 su `tj-api`: limiter dedicati applicati a login, newsletter, views, metriche Price Radar, proposta prodotto, price watch, Web Push e logging delle ricerche.

## P1 — Preparazione editoriale keynote

- [ ] Preparare Topic Hub Apple/iPhone e contenuti evergreen collegati.
- [ ] Preparare procedura breaking/live con responsabile, priorità e scadenza.
- [ ] Preparare immagini, categorie, fonti ufficiali e template newsletter.
- [ ] Definire piano di copertura prima/durante/dopo l’evento e fallback manuale dell’autoposter.
- [ ] Verificare che Price Radar e Compatibility contengano i prodotti/dispositivi rilevanti.

## P2 — Migliorie post-lancio non bloccanti

- [ ] Collegare il layer astratto `AiProvider` al percorso OpenAI live.
- [ ] Aggiungere scroll depth e reading completion testuale.
- [ ] Aggiungere finestre trending 1h/6h/24h quando esiste un segnale temporale affidabile.
- [ ] Decidere se introdurre account server-side; mantenere local-first finché non c’è un caso d’uso prioritario.
- [ ] Completare token spacing/radius/shadow del design system.
- [ ] Aggiungere test isolato della deduplicazione semantica.
- [ ] Valutare CSP report-only e pinning di `next-iubenda` dopo il lancio.

## Gate finale produzione

- [ ] Tutti i P0 chiusi o esplicitamente accettati con mitigazione.
- [ ] Nessun errore bloccante nei log delle ultime 24 ore di staging.
- [ ] Smoke test firmato su browser e dispositivi target.
- [ ] Merge/rebase verificato dei tre `dev` verso `main`.
- [ ] Promozione coordinata API → admin → frontend.
- [ ] Smoke test post-deploy e rollback pronto.
