# Scheduler esterni — configurazione e collaudo

Gli endpoint cron vivono in `tj-api` e richiedono sempre `Authorization: Bearer <CRON_SECRET>`. Lo scheduler deve considerare riusciti solo gli HTTP 2xx, conservare status e durata, tentare nuovamente con backoff e generare un alert dopo due fallimenti consecutivi. Il valore di `CRON_SECRET` deve essere identico nello scheduler e nel deployment API, mai inserito nei log.

## Matrice richiesta

| Job | Endpoint | Cadenza consigliata | Timeout | Nota |
| --- | --- | --- | --- | --- |
| Recupero coda | `/api/cron/ingest-recovery` | ogni 5 minuti | 60 s | Non chiama RSS o AI |
| Feed + autoposter | `/api/cron/ingest-feeds` | ogni 10 minuti | 300 s | Lock PostgreSQL anti-sovrapposizione |
| Riempimento giornata | `/api/cron/autopost-fill-day` | ogni giorno, 20:30 Europe/Rome | 300 s | Ripromuove i deferiti se sotto target |
| Worker audio | `/api/cron/article-audio-worker` | ogni minuto | 300 s | Un job per invocazione |
| Newsletter | `/api/cron/newsletter-daily` | ogni giorno, 08:00 Europe/Rome | 300 s | Invio idempotente entro la finestra |
| Digest Price Radar | `/api/cron/newsletter-price-radar-weekly` | lunedì, 08:15 Europe/Rome | 300 s | Settimanale |
| Controllo Price Radar | `/api/cron/price-radar` | timer VPS esistente | 300 s | Confermare timer e ultimo successo |
| Digest guide | `/api/cron/guide-review-digest` | lunedì, 09:00 Europe/Rome | 300 s | Revisione umana |
| Auto-update guide | `/api/cron/guide-auto-update` | ogni giorno, 05:30 Europe/Rome | 300 s | No-op se `GUIDE_AUTO_UPDATE_ENABLED` non è `true` |

Tutte le pianificazioni devono dichiarare esplicitamente il fuso orario o essere convertite in UTC tenendo conto di CET/CEST.

## Collaudo senza esporre segreti

Eseguire da una shell autorizzata, con variabili già caricate dal secret store:

```sh
curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer ${CRON_SECRET}" \
  "${TJ_API_BASE_URL}/api/cron/ingest-recovery"
```

Per ogni job registrare nella checklist di lancio: provider scheduler, schedule effettiva, timestamp e HTTP status dell’ultimo successo, durata, owner dell’alert e procedura di retry. Non copiare response body che possano contenere dettagli editoriali.

## Gate operativo

- Una chiamata senza header deve restituire 401.
- Una chiamata autenticata deve restituire 2xx; `skipped` per lock occupato è un esito valido.
- Verificare almeno un alert sintetico rendendo temporaneamente non valido l’URL del monitor, senza modificare il deployment.
- Prima del keynote controllare che l’ultimo successo di ogni job sia entro due volte la propria cadenza.
- Se il timer VPS Price Radar non è monitorabile, duplicarlo su uno scheduler esterno con la stessa autenticazione prima di dismetterlo.
