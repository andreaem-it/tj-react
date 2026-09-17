# Configurazione produzione Cloudflare

Questa lista non contiene valori. I segreti richiesti sono installati sui Worker
preview e produzione; il documento resta l'inventario per rotazione e recovery.

## Build del sito

Le variabili `NEXT_PUBLIC_*` finiscono nel bundle browser e devono essere presenti
durante `npm run cf:build:production`; aggiungerle dopo il deploy come secret non
aggiorna il client. Sono valori pubblici: URL del sito, GA/Clarity, AdSense,
iubenda, contatto, chiave VAPID pubblica e verifica Search Console.

## Runtime del Worker

| Variabile | Quando serve |
| --- | --- |
| `TJ_API_BASE_URL` | Quando l'API sostitutiva espone le route proxy server-side. |
| `AUTH_SECRET`, `ADMIN_USER` | Route protette del sito, se abilitate. |
| `PRICE_RADAR_ADMIN_SECRET` | Proxy amministrativi Price Radar. |
| `WP_WEBHOOK_SECRET` | Webhook di pubblicazione WordPress. |
| `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_PURGE_TOKEN` | Solo dopo che il dominio è su Cloudflare, per invalidare la cache. |
| `TJ_API_BYPASS_TOKEN`, `TJ_API_PROTECTION_BYPASS_SECRET`, `WP_TJ_BYPASS_TOKEN` | Solo se richiesti dall'API/origin scelto. |

## Prima del dominio

1. Rendere disponibile e collaudare l'API.
2. Ricostruire in produzione e usare `npm run cf:check:production`.
3. Importare solo le variabili necessarie all'API scelta.
4. Verificare login, webhook, cache e flussi editoriali su un ambiente isolato.
5. Al via esplicito applicare le Worker Routes preparate. I record DNS restano
   invariati e Vercel rimane l'origine di rollback.
