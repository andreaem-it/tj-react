# Migrazione alla CMP Google

Questo branch introduce la modalità sperimentale `NEXT_PUBLIC_CONSENT_PROVIDER=google`.
In assenza della variabile, il sito continua a usare iubenda: non impostare il flag
in produzione finché il messaggio di consenso non è pubblicato e validato.

## Configurazione in AdSense

1. Aprire **Privacy e messaggi** e creare un messaggio per le normative europee.
2. Collegarlo a `www.techjournal.it`, in italiano e nelle altre lingue realmente offerte.
3. Scegliere il layout con **Non acconsentire**, **Gestisci opzioni** e **Acconsenti**.
4. Selezionare un insieme minimo e motivato di partner tecnologici pubblicitari.
5. Attivare Consent Mode per finalità pubblicitarie e Analytics.
6. Inserire l'URL dell'informativa privacy di TechJournal e pubblicare il messaggio.

Google CMP distribuisce il messaggio tramite lo script AdSense e aggiorna Consent
Mode. Il codice di questo repository aspetta `CONSENT_MODE_DATA_READY` e usa lo
stato risultante per GA4, Clarity e gli slot pubblicitari.

## Attivazione su preview

Configurare nell'ambiente di preview:

```dotenv
NEXT_PUBLIC_CONSENT_PROVIDER=google
NEXT_PUBLIC_CONSENT_POLICY_VERSION=2026-10-18
NEXT_PUBLIC_PRIVACY_POLICY_URL=https://www.techjournal.it/privacy
NEXT_PUBLIC_COOKIE_POLICY_URL=https://www.techjournal.it/cookie-policy
```

Il flag viene letto in fase di build: dopo averlo modificato serve un nuovo deploy.

Sul backend `tj-api` devono essere configurati anche `CONSENT_RECEIPT_HASH_SECRET`
(segreto casuale di almeno 32 caratteri) e la stessa `CONSENT_POLICY_VERSION`.
Il registro conserva soltanto una ricevuta pseudonima: hash HMAC di un cookie
HttpOnly, data/ora, versione informativa, TC string TCF e lo stato Analytics/
marketing. Non conserva IP o user-agent. Se la scrittura non riesce, il frontend
mantiene bloccati GA4, Clarity e gli slot pubblicitari.

Prima del deploy in produzione applicare esplicitamente lo schema Postgres:

```bash
npm run consent-receipts:install
```

Questo passaggio e' necessario anche se il backend gira su Vercel: in produzione
le inizializzazioni automatiche dello schema sono intenzionalmente disattivate per
evitare migrazioni concorrenti durante i cold start. Sul Worker Cloudflare la
tabella viene verificata dal primo inserimento, ma va comunque installata prima
del rilascio per non dipendere dal traffico reale.

## Casi di prova obbligatori

Usare una finestra anonima e verificare, per ciascun caso, cookie, richieste di rete
e Tag Assistant:

1. Prima scelta: nessun tag Analytics/Clarity e nessuno slot pubblicitario prima della decisione. Lo script AdSense puo' essere presente solo per visualizzare la CMP.
2. Rifiuto: GA4 e Clarity restano bloccati; gli slot rimangono placeholder.
3. Solo finalità Analytics: GA4 e Clarity funzionano, senza pubblicità personalizzata.
4. Consenso pubblicitario: gli slot possono caricarsi e i quattro segnali Consent Mode
   riflettono le finalità autorizzate.
5. Revoca dal footer: la CMP riapre, Clarity riceve `denied` e gli slot spariscono.
6. In database: a ogni stato distinto deve comparire una riga in `consent_receipts`,
   con `policy_version` attesa e senza IP/user-agent. Se si interrompe tj-api,
   verificare che i tag opzionali non partano.

Per forzare il messaggio europeo su preview, usare `?fc=alwaysshow&fctype=gdpr`.

## Dopo la validazione

Solo dopo test e approvazione delle informative si potrà rimuovere iubenda:

- pacchetto `@mep-agency/next-iubenda` e configurazione Next;
- provider e componenti `Iubenda*`;
- endpoint `/api/iubenda-*`, rewrite e variabili d'ambiente;
- CSS e preconnect iubenda;
- contenuto importato da iubenda nella pagina privacy.

La CMP certificata non sostituisce la revisione legale di privacy e cookie policy.
