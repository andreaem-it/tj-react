# ERR_CERT_AUTHORITY_INVALID (GA, AdSense, Cloudflare)

## Cosa significa

Il browser **non si fida del certificato TLS** verso un dominio esterno. Non è un bug del certificato di `www.techjournal.it`.

## Fix nel codice (deploy automatico)

In **produzione**, GA e AdSense caricano gli script **dal tuo dominio**:

- `/3p/gtag/js?id=G-…` → rewrite verso Google Tag Manager
- `/3p/ads/pagead/js/adsbygoogle.js?client=…` → rewrite verso AdSense

Il browser apre HTTPS solo verso `www.techjournal.it` (certificato già valido).

Per disattivare il proxy: env `NEXT_PUBLIC_THIRD_PARTY_SCRIPT_PROXY=0`.

## Cloudflare Web Analytics (`static.cloudflareinsights.com`)

Questo script **non è nel repo**: lo inietta **Cloudflare** se Web Analytics è attivo.

### Disattivarlo (consigliato se usi già GA)

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → dominio `techjournal.it`
2. **Analytics & logs** → **Web Analytics**
3. Rimuovi/disattiva il sito **www.techjournal.it**

In alternativa: **Speed** → verifica che non ci siano integrazioni che iniettano `beacon.min.js`.

Finché resta attivo, puoi vedere `ERR_CERT_AUTHORITY_INVALID` su `cloudflareinsights.com` su reti con antivirus/proxy.

## Se persiste su Google (dopo il proxy)

Dopo il deploy, se in console vedi ancora certificati invalidi su:

- `region1.google-analytics.com`
- `googleads.g.doubleclick.net`

sono le **richieste di tracking/annunci** (non il file `.js` iniziale). Cause tipiche:

- Antivirus con “scansione HTTPS” (Kaspersky, Avast, ESET…)
- VPN / rete aziendale
- DNS filter (Pi-hole, AdGuard con MITM)

**Test rapido:** apri il sito da **telefono in 4G** (senza Wi‑Fi). Se lì non ci sono errori, il problema è la rete del PC, non il sito.

## Verifica post-deploy

```bash
curl -sI "https://www.techjournal.it/3p/gtag/js?id=G-BXNMEG88Y4" | head -5
```

Atteso: `HTTP/2 200` e `content-type` JavaScript (non HTML challenge).
