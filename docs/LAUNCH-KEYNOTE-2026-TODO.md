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

- [x] Collegare il layer astratto `AiProvider` al percorso OpenAI live. Completato in `tj-api` con adapter OpenAI, registry runtime, validazione strict, retry, circuit breaker e fallback chain (`60ae5f3`).
- [x] Aggiungere scroll depth e reading completion testuale. Tracker client a checkpoint deduplicati, tempo attivo, invio `sendBeacon`/keepalive e persistenza aggregabile in `tj-api` (`80914de`, `c1ac494`).
- [x] Aggiungere finestre trending 1h/6h/24h quando esiste un segnale temporale affidabile.
- [ ] Decidere se introdurre account server-side; mantenere local-first finché non c’è un caso d’uso prioritario.
- [ ] Completare token spacing/radius/shadow del design system.
- [x] Aggiungere test isolato della deduplicazione semantica. Già coperto in `tj-api` da `semanticDedup.test.ts` con casi limite, duplicati Neon/WordPress, soglia tematica e contenuto pubblicabile.
- [ ] Valutare CSP report-only e pinning di `next-iubenda` dopo il lancio.

## Gate finale produzione

- [ ] Tutti i P0 chiusi o esplicitamente accettati con mitigazione.
- [ ] Nessun errore bloccante nei log delle ultime 24 ore di staging.
- [ ] Smoke test firmato su browser e dispositivi target.
- [ ] Merge/rebase verificato dei tre `dev` verso `main`.
- [ ] Promozione coordinata API → admin → frontend.
- [ ] Smoke test post-deploy e rollback pronto.

## Registro evidenze 2026-08-26

- Resilienza API: aggiunti timeout espliciti per OpenAI (`8c83d2b`), Google TTS (`0f69382`, test deterministico `b874d32`), Brevo (`34f85f0`), Search Console (`a1ca046`), AdSense (`0f4e905`), GA4 realtime (`9583d6a`), client WordPress (`31d6476`) e recupero digest newsletter (`e16b77b`). Suite API finale: 165/165 test e build TypeScript verdi.
- Accessibilità admin: libreria media navigabile da tastiera, target da 44 px e dettaglio responsive (`223088b`); controlli della revisione guide portati a 44 px (`9c3766e`). Per entrambi: ESLint, TypeScript e build Next.js verdi.
- Accessibilità admin analytics: selettore e paginazione portati a 44 px, con nomi accessibili espliciti sui pulsanti icon-only (`67d4b74`). ESLint, TypeScript e build Next.js verdi.
- Accessibilità lista articoli: controlli di paginazione desktop portati a un target minimo di 44 px (`f52a8f3`). ESLint, TypeScript e build Next.js verdi.
- Accessibilità editor TL;DR: esiti di errore/salvataggio annunciati alle tecnologie assistive e azione primaria portata a 44 px (`ca3056e`). ESLint, TypeScript e build Next.js verdi.
- Accessibilità editor recensioni: caricamento ed esiti asincroni annunciati, campi compatti e salvataggio portati a 44 px (`20c3bd4`). ESLint, TypeScript e build Next.js verdi.
- Accessibilità editor breaking/live: feedback asincrono annunciato, intera riga del checkbox cliccabile e campi/azione primaria portati a 44 px (`e973e9b`). ESLint, TypeScript e build Next.js verdi.
- Accessibilità Price Radar admin: azioni mobile e desktop per pausa/ripresa, check, modifica, dettagli e creazione portate a 44 px (`bcfd163`). ESLint, TypeScript e build Next.js verdi.
- Accessibilità Compatibility admin: editor/import delle specifiche dispositivo e relativo checkbox portati a target di 44 px (`0c36ce1`). ESLint, TypeScript e build Next.js verdi.
- Accessibilità editor articoli: selettore blocco, toolbar di formattazione e form collegamento portati a target di 44 px (`dc83ee6`). ESLint, TypeScript e build Next.js verdi.
- Accessibilità form articolo: toggle editor/anteprima con stato annunciato, azioni immagine/revisioni e controlli della libreria media portati a 44 px; errori e caricamento media annunciati (`d69a77e`). Verifica React best practices, ESLint, TypeScript e build Next.js verdi.
- Accessibilità categorie admin: collegamento mobile “Apri sul sito” portato a un target minimo di 44 px (`ceaf46d`). ESLint, TypeScript e build Next.js verdi.
- Accessibilità pagina articoli: azioni principali “Da rivedere” e “Nuovo articolo” portate a 44 px (`85f9d3a`). ESLint, TypeScript e build Next.js verdi.
- Accessibilità homepage: collegamenti rapidi ai dispositivi Compatibility portati a un target minimo di 44 px (`1fe6c93`). ESLint, TypeScript, 335 test e build Next.js Webpack verdi.
- Accessibilità navigazione frontend: link delle barre desktop, incluso il fallback senza dati megamenu, portati a un’altezza minima di 44 px (`98f016b`). Verifica React best practices, ESLint, TypeScript, 335 test e build Next.js Webpack verdi.
- Accessibilità footer: tutti i collegamenti istituzionali e di navigazione portati a un target verticale minimo di 44 px (`cc5f187`). ESLint, TypeScript, 335 test e build Next.js Webpack verdi.
- Accessibilità login admin: errore annunciato come alert e campi, invio e collegamento al sito pubblico portati a 44 px (`800a0ef`). ESLint, TypeScript e build Next.js verdi.
- AI provider, prerequisito wiring live: schema strict del triage riallineato al payload realmente prodotto (`accept|skip|defer` e relativi campi), eliminando una futura incompatibilità del validatore (`50027b1`). Suite API 165/165 e build TypeScript verdi.
- AI provider live: `openaiIngest` usa ora realmente `AiProvider`, con adapter OpenAI e composizione registry → validazione schema/embedding → retry → circuit breaker → catena di fallback (`60ae5f3`). Suite API ampliata a 168/168 test e build TypeScript verde.
- Analytics lettura, backend: endpoint pubblico rate-limited, upsert privacy-first per sessione/post e riepilogo admin per profondità, completamento e tempo attivo (`80914de`). Suite API ampliata a 171/171 test e build TypeScript verde.
- Analytics lettura, frontend: tracker senza UI sul corpo dell’articolo con profondità 25/50/75/90%, completamento, tempo attivo e invio best-effort tramite proxy same-origin (`c1ac494`). Verifica React best practices, ESLint, TypeScript, 337 test e build Next.js Webpack verdi.
- Trending temporale, backend: conteggi visualizzazioni aggregati per ora e endpoint batch per finestre reali 1h/6h/24h, senza derivarli dal totale storico (`f26193c`). Suite API 171/171 e build TypeScript verdi.
- Trending temporale, frontend: la homepage usa il segnale orario reale e mostra classifiche separate a 1h, 6h e 24h, con fallback alle classifiche storiche finché i bucket non contengono dati (`33cb68e`). TypeScript, ESLint, 339 test e build Webpack verdi.
- Moderazione ingestor completata: oltre al mismatch titolo/contenuto, gli URL generati vengono verificati nel flusso manuale e nell’autoposter; link non sicuri bloccano e link irraggiungibili/timeout alimentano il quality score (`93256da`). Suite API 173/173 e build TypeScript verdi.
