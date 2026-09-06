# Matrice variabili deploy — TechJournal

Audit eseguito il 2026-08-26 sui progetti Vercel `tj-react`, `tj-api` e `tj-react-admin`. Sono stati letti esclusivamente i nomi e gli scope delle variabili, mai i valori.

## Stato sintetico

| Area | Preview | Production | Esito |
| --- | --- | --- | --- |
| Database/Postgres | presente | presente | pronto, connettività da collaudare |
| Login admin (`AUTH_SECRET`, utente, hash password) | presente su API/admin | presente su API/admin | pronto, login da smoke-testare |
| OpenAI | chiave e modello presenti | chiave e modello presenti | pronto, percorso reale da collaudare |
| WordPress Application Password | presente su API | presente su API | pronto, scrittura reale da collaudare |
| Google TTS | credenziali Google generiche presenti | credenziali Google generiche presenti | fallback previsto dal codice, API/permessi da collaudare |
| R2 audio/media | credenziali e bucket presenti | credenziali e bucket presenti | pronto, lettura/scrittura da collaudare |
| Price Radar | secret admin/feed presenti | secret admin/feed presenti | pronto, cron/timer da confermare |
| Cron esterni (`CRON_SECRET`) | **assente** | **assente** | bloccante per tutti gli endpoint `/api/cron/*` |
| Audio automatico (`ARTICLE_AUDIO_AUTO_ENQUEUE`) | assente, quindi `false` | assente, quindi `false` | rollout intenzionalmente spento |
| Player audio (`FEATURE_ARTICLE_AUDIO`) | presente in Preview | assente in Production, quindi `false` | rollout Production spento |
| Web Push VAPID | **assente** | **assente** | invio push e Price Alert push non operativi |
| Chiave pubblica push frontend (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`) | **assente** | **assente** | opt-in browser non operativo |
| Brevo iscrizioni | chiave/lista presenti | chiave/lista presenti | iscrizione disponibile |
| Brevo invio (`BREVO_SENDER_EMAIL`) | **assente** | **assente** | campagne e notifiche email non inviabili |
| Email digest guide (`ADMIN_NOTIFICATION_EMAIL`) | assente | assente | digest interno disabilitato |
| Autoposter (`AUTOPOST_ENABLED`) | assente, quindi `false` | assente, quindi `false` | pubblicazione automatica spenta |
| Auto-update guide (`GUIDE_AUTO_UPDATE_ENABLED`) | assente, quindi `false` | assente, quindi `false` | scrittura evergreen automatica spenta |

## Configurazioni P0 da completare

### API (`tj-api`)

- [ ] Generare/configurare `CRON_SECRET` in Preview e Production.
- [ ] Collegare lo stesso secret allo scheduler esterno senza esporlo al browser.
- [ ] Configurare `BREVO_SENDER_EMAIL` con un mittente verificato in Brevo.
- [ ] Configurare `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT`.
- [ ] Decidere e documentare l’attivazione di `AUTOPOST_ENABLED`.
- [ ] Attivare `ARTICLE_AUDIO_AUTO_ENQUEUE=true` soltanto dopo il collaudo TTS/R2/worker.
- [ ] Valutare `ADMIN_NOTIFICATION_EMAIL` per i digest editoriali interni.
- [ ] Lasciare `GUIDE_AUTO_UPDATE_ENABLED=false` finché i suggerimenti non sono stati validati manualmente.

### Frontend (`tj-react`)

- [ ] Configurare `NEXT_PUBLIC_VAPID_PUBLIC_KEY` con la stessa chiave pubblica dell’API.
- [ ] Mantenere `FEATURE_ARTICLE_AUDIO` limitato a Preview durante il collaudo.
- [ ] Aggiungere `FEATURE_ARTICLE_AUDIO=true` in Production soltanto dopo backfill e smoke test.
- [ ] Verificare che `TJ_API_BASE_URL` Production punti al backend definitivo e non a un deployment immutabile Preview.

### Admin (`tj-react-admin`)

- [ ] Verificare `TJ_API_BASE_URL` Production e `PRICE_RADAR_ADMIN_SECRET` con chiamate reali.
- [ ] Mantenere `TJ_API_PROTECTION_BYPASS_SECRET` solo dove il backend Preview è protetto.
- [ ] Smoke testare login, Ingestor, audio e Price Radar dopo ogni cambio di ambiente.

## Regole di sicurezza

- Non inserire mai valori o hash sensibili in documentazione, commit, output CI o screenshot.
- Secret condivisi fra servizi devono essere uguali dove previsto, ma gestiti separatamente per Preview e Production.
- Ogni modifica alle variabili richiede un nuovo deployment: Vercel congela l’ambiente al momento del build/deploy.
- L’attivazione dei flag che producono scritture o costi deve avvenire dopo un test controllato e con rollback definito.
