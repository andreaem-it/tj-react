# TechJournal — checklist lancio keynote 2026

Ultimo aggiornamento: 2026-09-03. Keynote confermato da Apple: 9 settembre 2026, ore 19:00 CEST.

Questa checklist misura la prontezza al lancio, non sostituisce il Piano 94. Ogni blocco va chiuso con stato Git controllato, file propri aggiunti esplicitamente, test/typecheck/lint/build proporzionati, commit autonomo e push su `origin/dev`.

## Regole di esecuzione

- [ ] Non modificare né includere il lavoro non committato di Claude.
- [ ] Un solo obiettivo verificabile per commit.
- [ ] Nessuna promozione in produzione prima del gate finale esplicito.
- [ ] Annotare qui evidenze, commit e blocchi esterni man mano che vengono chiusi.

## P0 — Integrità del candidato al lancio

- [x] Far completare e committare separatamente a Claude le sitemap segmentate già presenti nel worktree frontend. Completato con `3d4fbda`; i cinque segmenti sono raggiungibili in produzione.
- [x] Riallineare questa checklist con il Piano 94 dopo la chiusura delle sitemap, senza sovrascrivere modifiche altrui. Verificato il 5 settembre 2026.
- [x] Verificare che `dev` sia verde nei tre repository: test, TypeScript, ESLint dove configurato e build di produzione. Verificato il 2026-08-26: frontend 328 test + lint + typecheck + build Webpack; API 162 test + build TypeScript; admin lint + typecheck + build Webpack.
- [x] Preparare una matrice delle variabili necessarie per Preview e Production senza copiarne i valori nei log. Vedi `docs/DEPLOY-ENV-MATRIX.md`; audit dei soli nomi completato il 2026-08-26.
- [ ] Confermare backup, rollback e deployment precedente recuperabile per frontend, API e admin.

## P0 — WordPress e pipeline editoriale

- [x] Importare l’archivio WordPress nel database editoriale, preservando `wp_id`, contenuto e metadati, senza avviare il backfill audio.
- [x] Importare automaticamente nel database editoriale ogni post WordPress alla prima pubblicazione, tramite webhook idempotente. Il plugin usa direttamente `backend.techjournal.it` per evitare il proxy frontend.
- [ ] Verificare nell’admin WordPress che il plugin TechJournal API 1.7.0 sia installato e attivo.
- [ ] Verificare una scrittura autenticata reale di TL;DR e breaking tramite `tj-api`.
- [ ] Eseguire il percorso completo feed → AI → WordPress → frontend con un contenuto di prova controllato.
- [ ] Verificare attribuzione autore, changelog e campi recensione.
- [ ] Preparare e pubblicare almeno una recensione reale con metodologia, durata, voto, pro e contro.

Collaudo Production 3 settembre 2026: importati 1.573 articoli WordPress, 4 già presenti, 0 errori (1.577 record WordPress totali). Il trigger di generazione audio è sospeso; nessun job è in coda o in elaborazione.

## P0 — Lettura audio articoli

- [x] Verificare credenziali Google Cloud TTS e accesso R2 nel deployment candidato.
- [x] Verificare enqueue, worker, retry, persistenza segmenti e stato coda.
- [ ] Eseguire un backfill controllato di articoli rappresentativi e controllarne i costi.
- [ ] Collaudare player su Safari iPhone, Chrome Android e desktop: play/pausa, seek, velocità, ripresa e cambio segmento.
- [ ] Verificare accessibilità tastiera, screen reader, focus e target touch del player.
- [ ] Abilitare `ARTICLE_AUDIO_AUTO_ENQUEUE` solo dopo il collaudo del worker.
- [x] Abilitare `FEATURE_ARTICLE_AUDIO` solo dopo disponibilità audio sufficiente.

Collaudo Production 1 settembre 2026: tre job completati al primo tentativo con Achernar; player desktop caricato con segmento R2 `audio/mpeg`, durata 65,328 secondi e nessun errore console. La pagina canonica può conservare l'HTML precedente fino alla scadenza/purge della cache Cloudflare, mentre una cache key nuova espone già il player.

## P0 — Scheduler e automazioni

- [ ] Confermare scheduler `ingest-feeds` ogni circa 10 minuti.
- [ ] Confermare scheduler `autopost-fill-day` giornaliero.
- [x] Confermare scheduler `article-audio-worker` ogni minuto.
- [ ] Confermare scheduler newsletter giornaliera e Price Radar settimanale.
- [ ] Confermare scheduler guide review/auto-update e stato del relativo feature flag.
- [ ] Confermare timer VPS Price Radar oppure predisporre un sostituto monitorato.
- [ ] Verificare autenticazione `CRON_SECRET`, log dell’ultimo successo e alert sui fallimenti.

Collaudo Production 3 settembre 2026: il Worker Cloudflare `tj-audio-scheduler` ha il trigger `* * * * *` applicato alla versione attiva; il job audio dell’articolo 8 ha completato con Achernar al primo tentativo (`ready`). L’handler registra e propaga gli errori al Cron Event invece di perdere un fallimento in background.

## P0 — Smoke test end-to-end

- [ ] Login/logout e durata sessione admin.
- [ ] Ingestor: feed, impostazioni AI, voce, elaborazione singola/batch e gestione errori.
- [ ] Articoli: creazione, modifica, TL;DR, breaking, revisione, media e pubblicazione.
- [ ] Frontend: homepage, categorie, articolo, topic hub, autore, ricerca e pagine istituzionali.
- [ ] Price Radar: catalogo, dettaglio, storico, proposta lettore, moderazione, modifica/eliminazione e batch manuale.
- [ ] Compatibility: dispositivi, sistemi operativi, matrice, confronto e import admin.
- [ ] Newsletter, Web Push, Price Alert e incremento visualizzazioni articolo.
- [ ] Sitemap, robots, feed RSS, metadata, JSON-LD e canonical.

Smoke pubblico 5 settembre 2026: `www.techjournal.it`, categoria Apple, Topic Hub iPhone 18, Price Radar e Compatibility rispondono 200 e mostrano contenuto; `backend.techjournal.it/health` risponde 200. Restano da completare i percorsi autenticati e le verifiche funzionali elencate sopra.

SEO tecnico pubblico 5 settembre 2026: `robots.txt`, `sitemap.xml` e `feed.xml` rispondono 200; la categoria Apple espone canonical e due blocchi JSON-LD. Restano da verificare le sitemap segmentate e le pagine articolo.

Compatibilità permalink 6 settembre 2026: aggiunti redirect permanenti dalle URL WordPress annidate e dalle varianti AMP/feed agli URL canonici; la suite verifica i casi Apple, App, Gaming e la conservazione dei parametri di query.

## P1 — UI, accessibilità e responsive

- [x] Aggiungere tema opzionale Liquid Glass con selettore dedicato, wallpaper fisso, movimento ambientale lento ma percepibile su due piani, rifrazione SVG, fallback e reduced motion.
- [ ] Audit visuale sistematico su 320, 375, 390, 430, 768, 1024, 1440 e 1920 px.
- [ ] Correggere overflow, wrapping, altezze, spaziature e target inferiori a 44×44 px.
- [ ] Verificare navigazione completa da tastiera, ordine focus, dialog e sidepanel.
- [ ] Verificare contrasto, zoom 200%, reduced motion e testi lunghi.
- [ ] Controllare in particolare homepage, articolo/player, ricerca, Price Radar, Compatibility e admin Ingestor.

Correzione UI 6 settembre 2026: l'immagine in evidenza degli articoli occupa ora l'intera card editoriale, indipendente dalla larghezza della colonna testuale (`page.tsx` articolo); test, TypeScript ed ESLint verdi.
- [x] Aggiungere nella dashboard e nell’editor articoli lo stato audio sempre visibile, progress bar indeterminata e azione di rigenerazione per i job falliti; gli articoli importati da WordPress attendono la normalizzazione dell’editor prima di rilevare modifiche locali.

## P1 — Performance e resilienza

- [ ] Misurare Core Web Vitals/Lighthouse sul deployment candidato per homepage e articolo.
- [ ] Verificare immagini responsive, font, CLS pubblicitario e bundle client.
- [ ] Verificare fallback e timeout con WordPress, `tj-api`, TTS, R2, OpenAI e Brevo indisponibili.
- [ ] Eseguire controllo runtime log/errori Vercel e definire soglie di allarme.
- [x] Verificare rate limiting e protezione degli endpoint pubblici mutanti. Audit completato il 2026-08-26 su `tj-api`: limiter dedicati applicati a login, newsletter, views, metriche Price Radar, proposta prodotto, price watch, Web Push e logging delle ricerche.

Incident response 6 settembre 2026: i cold start Vercel eseguivano le `ensure*Schema`, saturando il pool Supabase in session mode e causando 500 su Price Radar e Compatibility. `tj-api` ora salta tali ensure sui cold start e preferisce il transaction pooler tramite `DATABASE_URL_TRANSACTION`; verifica concorrente post-deploy: health, due schede Compatibility e due route Price Radar tutte 200.

Hardening build 6 settembre 2026: le fetch server-side di Price Radar e Compatibility riusano gli header autenticati del proxy verso tj-api, inclusi i bypass configurati, così i worker Vercel non degradano su fallback per controlli anti-bot.

Resilienza deploy 6 settembre 2026: la pre-generazione delle schede Price Radar e Compatibility è differita a ISR on-demand. Un timeout momentaneo di `tj-api` non viene più ripetuto per ogni ASIN/dispositivo e non può rallentare il rilascio; il contenuto è generato e cacheato alla prima visita. Le chiamate server Price Radar hanno inoltre un breve circuit breaker per non martellare un upstream indisponibile durante una rigenerazione.

## P1 — Preparazione editoriale keynote

- [x] Preparare Topic Hub Apple/iPhone e piano dei contenuti evergreen collegati. Hub già presenti nel registry; verifica editoriale e contenuti assegnati nel runbook.
- [x] Preparare procedura breaking/live con responsabile, priorità e scadenza. Vedi `docs/KEYNOTE-2026-EDITORIAL-RUNBOOK.md`.
- [x] Preparare immagini, categorie, fonti ufficiali e template newsletter. Requisiti e fallback definiti nel runbook; gli asset finali vanno selezionati dalla redazione.
- [x] Definire piano di copertura prima/durante/dopo l’evento e fallback manuale dell’autoposter. Vedi runbook editoriale.
- [ ] Verificare che Price Radar e Compatibility contengano i prodotti/dispositivi rilevanti.

## P2 — Migliorie post-lancio non bloccanti

- [x] Collegare il layer astratto `AiProvider` al percorso OpenAI live. Completato in `tj-api` con adapter OpenAI, registry runtime, validazione strict, retry, circuit breaker e fallback chain (`60ae5f3`).
- [x] Aggiungere scroll depth e reading completion testuale. Tracker client a checkpoint deduplicati, tempo attivo, invio `sendBeacon`/keepalive e persistenza aggregabile in `tj-api` (`80914de`, `c1ac494`).
- [x] Aggiungere finestre trending 1h/6h/24h quando esiste un segnale temporale affidabile.
- [x] Decidere se introdurre account server-side; decisione lancio: mantenere local-first, con Price Alert sottoscritto direttamente via API e rivalutazione post-keynote solo in presenza di un caso d’uso prioritario.
- [x] Completare token spacing/radius/shadow del design system.
- [x] Aggiungere test isolato della deduplicazione semantica. Già coperto in `tj-api` da `semanticDedup.test.ts` con casi limite, duplicati Neon/WordPress, soglia tematica e contenuto pubblicabile.
- [x] Valutare CSP report-only e pinning di `next-iubenda`: prerelease fissata esattamente a `1.0.0-alpha5`; CSP completa in report-only rinviata al post-lancio, dopo endpoint di raccolta e baseline staging (resta attivo `frame-ancestors 'none'`).

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
- Design system: aggiunti token semantici condivisi per spacing, raggi e ombre, con varianti light/dark; migrate sidebar homepage, card Price Radar e dialog newsletter (`fb27833`). TypeScript, ESLint, 339 test e build Webpack verdi.
- Account pubblico: chiusa la decisione architetturale per il lancio mantenendo il profilo local-first; non si introduce a ridosso del keynote un sistema identità con nuova superficie privacy e migrazione dati. I Price Alert restano server-side tramite sottoscrizione esplicita.
- Dipendenze/CSP: eliminato l’aggiornamento implicito della prerelease `next-iubenda` fissandola a `1.0.0-alpha5` (`a4b6e08`). Una policy CSP completa report-only richiede prima un collector e una baseline staging per evitare rumore o regressioni dei servizi terzi; attività deliberatamente post-lancio. TypeScript, ESLint e 339 test verdi.
- Preparazione keynote: data ufficiale aggiornata al 9 settembre, responsabilità, sequenza prima/durante/dopo, fonti primarie, asset, newsletter e fallback manuali raccolti in `docs/KEYNOTE-2026-EDITORIAL-RUNBOOK.md`.
- Scheduler: endpoint, frequenze, timeout, autenticazione, criteri di successo, alert e collaudo raccolti in `docs/SCHEDULER-RUNBOOK.md`. Le caselle P0 restano aperte finché non vengono registrati gli ultimi successi reali del provider/VPS.

## Registro evidenze 2026-08-31

- Smoke test browser in sola lettura: homepage, Topic Hub, pagine istituzionali, articolo, admin articoli, analitiche e Compatibility risultano raggiungibili e popolati sul deployment dev. La Libreria media risponde ma impiega circa 17 secondi e risulta vuota. Restano bloccanti l'assenza di audio pronti/player visibili, Price Radar senza database e il VPS scraper senza heartbeat.
- Accessibilità homepage: il form tecnico WebMCP conservava la classe `sr-only`, ma nel CSS del deployment i suoi controlli risultavano visibili e alti 24 px. Aggiunta una definizione CSS robusta della utility assistiva senza rimuovere il form dall'albero del documento. ESLint e 339 test verdi; typecheck bloccato da `.next/types/validator.ts` generato contro il `next.config.ts` non committato e di proprietà Claude.
- Trasparenza AI: la pagina pubblica descrive ora anche l'uso dei modelli nella fase redazionale (traduzione, triage e preparazione bozze), i controlli automatici e la coda di revisione, distinguendolo chiaramente dal rendering deterministico del sito.
- TTS in staging: elenco Google Cloud caricato con successo dopo circa 18 secondi; la voce salvata è `it-IT-Chirp3-HD-Achernar` e l'azione di anteprima risulta disponibile. La generazione audio e la coda restano da collaudare con una chiamata reale autorizzata.
