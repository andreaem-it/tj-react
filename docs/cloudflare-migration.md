# Migrazione Cloudflare — preview, 14 settembre 2026

## Vincolo operativo
Nessuno switch fino al completamento della migrazione e delle verifiche.
Non modificare DNS, custom domain, route di produzione o webhook esistenti.
Non eseguire push sui branch collegati ai deploy Vercel durante questa preparazione.

## Preparazione presente
- Next.js 16.3.5, OpenNext 1.20.6, Wrangler 4.131.2.
- Configurazione esplicita `wrangler.preview.jsonc`: Worker con suffisso preview,
  nessuna route di dominio, bucket R2 separato, Durable Objects per ISR e tag.
- Nessuna migrazione dei dati editoriali: R2 e Durable Objects qui servono solo alla cache.
- `CLOUDFLARE_PREVIEW=1` abilita noindex. Il sito esclude il purge della CDN di produzione.
- Configurazioni Vercel e configurazione D1 legacy conservate.
- Nessun deploy remoto eseguito.

## Comandi (dalla directory di ciascuna app)
- `npm run cf:build`: build Next e bundle Worker della preview.
- `npm run cf:dry-run`: verifica il bundle senza deploy.
- `npm run cf:typegen`: genera tipi locali dei binding.
- `npm run cf:preview`: avvia runtime locale e popola cache locale.
- `npm run cf:deploy:preview`: pubblica il bundle già costruito; usare solo dopo i controlli.
  Richiede autenticazione Cloudflare valida, bucket preview e segreti runtime.

I segreti locali vanno in `.dev.vars` (ignorato da Git), quelli remoti nei secrets
Wrangler del solo Worker preview. Non copiare indiscriminatamente credenziali di
produzione. Impostare esplicitamente gli URL API e i valori NEXT_PUBLIC_* durante
la build: le variabili del browser sono incorporate nel bundle.
Il file `public/_headers` contiene noindex per gli asset della preview: adattarlo
prima di un futuro rilascio di produzione.

## Verifiche del primo passaggio
- Admin: build Next/TypeScript e bundle OpenNext riusciti; dry-run riuscito,
  gzip circa 2.62 MiB. API senza sessione restituisce 401 in workerd locale.
- Admin: login restituisce 500 perché l'instrumentation richiede
  PRICE_RADAR_ADMIN_SECRET, assente dai file locali disponibili. Non è stata
  disabilitata la validazione e non è stato simulato il superamento del controllo.
- Sito: compilazione e TypeScript della build riusciti; 339 test superati.
  Prerendering interrotto dopo ripetuti timeout (>60 s) su articoli, home e topic;
  osservate anche risposte 500 del backend per cronologie Price Radar.
  Il bundle Worker del sito non è ancora verificato.
- Wrangler: autenticazione scaduta, refresh fallito. Preview online bloccata
  fino a nuovo login o token con autorizzazioni adeguate.

## Lavoro restante prima dello switch
1. Ripristinare autenticazione Wrangler e disponibilità del segreto admin.
2. Diagnosticare timeout di prerendering e richieste backend fallite senza
   mascherarle con fallback che compromettano contenuti o indicizzazione.
3. Completare build, dry-run e runtime del sito; configurare preview remote
   con credenziali selezionate e bucket dedicati.
4. Verificare browser, login/logout, sessioni, lettura articoli, upload e flusso
   editoriale usando contenuti di test controllati. Le API restano collegate
   al backend esistente: operazioni di scrittura possono avere effetti reali.
5. Verificare ISR e invalidazione su home/categorie/articolo, ricerca, immagini,
   redirect, sitemap, canonical, consenso e annunci. Non reindirizzare ancora
   i webhook di produzione.
6. Definire configurazione di produzione, monitoraggio e rollback; rimuovere
   noindex solo per il rilascio finale e completare le verifiche prima dello switch.


## Aggiornamento verificato — 15 settembre 2026

- Build OpenNext completa riuscita per entrambe le app con Next 16.3.5.
  La patch ha superato la prova isolata della home; nella build successiva
  completa si sono ancora verificati timeout transitori con retry. Non attribuire
  quindi tutti i timeout alla sola versione Next.
- Preview sito: prerendering limitato a 2 worker e 2 pagine simultanee per worker.
- Tipi generati Wrangler esclusi dal progetto TypeScript Next: i tipi Worker
  globali rendevano Response.json() unknown nei componenti browser dell'admin.
- Dry-run dei due bundle riuscito; 339 test sito superati, lint e TypeScript sito
  superati, lint admin superato.
- Browser locale Cloudflare: home con contenuti e navigazione verso articolo
  verificate. Test HTTP: home, articolo, sitemap, robots e feed restituiscono 200
  e X-Robots-Tag noindex. Non è ancora una verifica completa di tutti i flussi.
- Webhook preview: richiede WP_WEBHOOK_SECRET, invalida esclusivamente la cache
  preview e restituisce forwarded:false senza chiamare il backend social/push.
  Test locale: richiesta senza segreto 401; richiesta valida 200; articolo
  HIT prima, MISS dopo invalidazione, HIT alla richiesta seguente, contenuto presente.
  Il segreto usato per questo test è casuale, locale e salvato solo in .dev.vars.
- Script cf:check:preview collegato al deploy: verifica Worker e binding preview,
  assenza di route dominio e header noindex nel manifest. Prove negative superate
  per route di produzione e build senza noindex. Non sostituisce revisione completa
  della configurazione o verifica che il bundle sia aggiornato all'ultimo sorgente.
- Telemetria specifica Vercel esclusa dal layout della preview Cloudflare.

### Blocchi attuali

1. Autenticazione Wrangler ancora scaduta: aperto login nel browser integrato,
   ma il callback OAuth è scaduto in attesa dell'utente. Una volta completato
   il login al dashboard, avviare una nuova richiesta Wrangler e aprirne l'URL
   nella stessa sessione browser. Nessuna preview remota pubblicata.
2. PRICE_RADAR_ADMIN_SECRET ancora assente da tj-react-admin/.dev.vars.
   Non modificata la validazione obbligatoria dell'admin.
3. Il 15 settembre backend.techjournal.it restituisce HTTP 402 con
   x-vercel-error: DEPLOYMENT_DISABLED. È un blocco esterno confermato, senza
   attribuzione della causa a quota/fatturazione oltre al messaggio del provider.
   Va ripristinato o migrato separatamente prima della verifica end-to-end;
   il solo trasferimento dei frontend non elimina questa dipendenza da Vercel.

Non effettuare switch, modifiche DNS o inoltro dei webhook di produzione.
Le build completate durante il disservizio possono contenere sezioni di fallback:
rigenerare e ricontrollare dopo il ripristino del backend prima della pubblicazione.

### Anteprime remote — 15 settembre 2026

- OAuth Wrangler completato sull'account Cloudflare `7e95066c3fccb22a7bef063c0454013e`.
- Creati esclusivamente `tj-web-preview-cache` e `tj-admin-preview-cache` in R2.
- Pubblicato il sito su `https://tj-web-preview.andreaem.workers.dev` senza route
  o dominio personalizzato. Home, articolo e sitemap rispondono 200 con
  `X-Robots-Tag: noindex, nofollow`; il webhook senza segreto risponde 401.
- Pubblicato l'admin su `https://tj-admin-preview.andreaem.workers.dev`. La root
  reindirizza al login e `/login` risponde 200 con noindex.
- Nessun DNS, dominio di produzione o webhook di produzione è stato modificato.
- `PRICE_RADAR_ADMIN_SECRET` resta assente: le funzioni Price Radar dell'admin non
  sono ancora collaudabili. Il backend Vercel disabilitato resta un blocco per i
  test end-to-end e richiederà una migrazione separata.

### Stato corrente — 15 settembre 2026

- L'API non viene migrata in questa fase. I Containers Cloudflare richiedono
  Workers Paid e sono quindi fuori dal perimetro del piano Free; nessun VPS è
  stato selezionato o modificato.
- Le preview frontend sono integre: lint e build Next riescono per sito e admin;
  home, articolo e sitemap del sito restituiscono 200, mentre l'admin reindirizza
  la root al login e il login restituisce 200. Tutte le risposte preview hanno
  `X-Robots-Tag: noindex, nofollow` dove previsto.
- Il backend esistente continua a restituire 402. Price Radar e Compatibility
  restano pertanto non disponibili nella preview; è un limite noto della verifica
  end-to-end, non un motivo per cambiare DNS, domini o webhook.

### Configurazione di produzione predisposta

- `wrangler.production.jsonc` definisce il futuro Worker `tj-web` senza route e
  con `workers_dev: false`: non può ricevere traffico finché non sarà configurato
  esplicitamente il dominio al momento dello switch.
- Cache R2 e Durable Objects di produzione hanno nomi distinti dalle preview.
- Le build di produzione eliminano gli header preview `noindex`; le build preview
  li generano come artefatto separato. Entrambe le configurazioni hanno superato
  build OpenNext e `wrangler deploy --dry-run` prima della pubblicazione isolata.

### Risorse predisposte senza switch

- Creato il bucket R2 vuoto `tj-web-cache` e pubblicato il Worker `tj-web`
  (versione `fefe35dc-797b-408f-8c58-7b7426980cf6`).
- Il Worker ha `workers_dev: false` e nessuna route: non esiste un URL pubblico,
  nessun DNS è stato modificato e non riceve traffico.

## Aggiornamento — 16 settembre 2026

- Le tre preview Cloudflare sono online e rispondono: sito, admin e API edge.
- L'admin preview usa l'API edge Cloudflare; una richiesta login non valida attraversa il proxy e restituisce correttamente 401.
- Il backend API è stato portato su Workers Free con Hyperdrive e R2. Le route pubbliche di Compatibility e Price Radar rispondono 200; il catalogo Price Radar contiene 101 prodotti.
- Compatibility include ora l'import bulk JSON transazionale e la modalità dry-run. Il feed Price Radar scrive lo storico con lo schema PostgreSQL corretto.
- La suite API completa passa con 174 test; lo smoke remoto Cloudflare passa 11 controlli su route pubbliche e protezioni admin/webhook/cron.
- Le versioni di produzione di sito, admin e API sono caricate senza custom domain, route, cron trigger o traffico. Il codice è pronto per l'attivazione controllata dopo il via esplicito.
- Restano da installare le credenziali provider non trasferibili automaticamente e da collaudare le operazioni che le usano. Nessuna credenziale è stata indebolita o sostituita per aggirare i controlli.

## Stato finale pre-switch — 17 settembre 2026

- Sito, admin e API sono completi sui Worker preview e sui Worker di produzione
  dormienti. Le versioni definitive sono assegnate internamente, senza Worker
  Routes, custom domain o Cron Trigger attivi.
- Tutti i segreti necessari sono installati. Brevo, WordPress, Google, VAPID,
  Meta, Hyperdrive e R2 sono collegati; lo scraper Price Radar e Compatibility
  sono stati verificati sulla preview.
- L'API include lo scheduler nativo con cinque trigger, autopost Facebook e
  Instagram idempotente e consegna Web Push delle soglie Price Radar.
- Test finali: 339 test sito e 180 test API; build Next/TypeScript e dry-run
  Wrangler di preview, produzione e configurazioni di cutover riusciti.
- Lo switch usa Worker Routes sugli hostname già proxati. Non richiede una
  modifica DNS e mantiene Vercel come origine immediata di rollback.
- Comando e rollback sono fissati in
  `../tj-api/docs/cloudflare-switch-runbook.md`. Nessuno dei due è stato eseguito.

## Switch completato — 17 settembre 2026

- Attivate le Worker Routes di sito, admin e API e i cinque Cron Trigger.
- Corretto durante lo smoke il redirect host generato da Next/OpenNext che
  restituiva `308 /:path*`; la versione web attiva è
  `332a264e-9fff-4d94-8e66-62f8e552fb82`.
- Verificati sul dominio reale home, articolo, ricerca, Price Radar,
  Compatibility, sitemap, feed, immagini R2, API pubbliche, protezioni e flussi
  admin autenticati. I tail di errore dei tre Worker sono rimasti vuoti durante
  il controllo.
- Il rollback verso l'origine Vercel resta disponibile senza modificare DNS.
