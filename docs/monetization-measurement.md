# Consenso e misurazione della monetizzazione

## Comportamento del codice

- Iubenda avvolge l'app dal primo render; le preferenze aggiornano i servizi senza rimontare il contenuto.
- Preferenze assenti, non caricate o configurazione CMP mancante non autorizzano GA4, Clarity o AdSense.
- La finalità `measurement` abilita GA4 e Clarity. La finalità `marketing` controlla separatamente i segnali pubblicitari.
- Una revoca aggiorna i segnali Consent Mode e Clarity; gli slot AdSense vengono smontati. Gli script già eseguiti non possono essere annullati rimuovendo il tag dal DOM.
- AdSense viene caricato solo dopo consenso marketing. Non è implementato un percorso per limited ads senza consenso: le impression possono diminuire rispetto al precedente caricamento incondizionato.
- Ogni cambio di pathname crea un nuovo elemento annuncio. Non ci sono refresh a tempo; cambiare solo la query non ricarica gli annunci.
- Gli slot attendono il caricamento dello script prima del push: nessuna richiesta resta accodata per un elemento rimosso durante la navigazione. Gli slot senza larghezza non vengono inizializzati.
- GA4 usa un solo invio manuale di `page_view`, anche quando il consenso arriva dopo il primo render. Sono inclusi navigazione interna, query e avanti/indietro.

## Configurazione GA4 prima del rilascio

1. Nel flusso web GA4, aprire **Misurazione avanzata → Visualizzazioni di pagina → Impostazioni avanzate** e disabilitare l'invio basato sui cambiamenti della cronologia del browser. Il codice gestisce le page view SPA; `send_page_view: false` disabilita l'invio automatico della configurazione, ma non sostituisce questa impostazione della proprietà.
2. Registrare `page_type` come dimensione personalizzata con ambito evento. I valori sono `home`, `price_radar`, `compatibility`, `other` e i tipi editoriali esistenti: `news`, `guide`, `review`, `comparison`, `deal`, `deep-dive`.
3. Collegare AdSense a GA4, verificando disponibilità e attribuzione dei dati nel proprio account. La sola emissione di eventi non crea dati di ricavo.
4. In un'esplorazione confrontare tipo di pagina, visualizzazioni e ricavi pubblicitari disponibili. Per ricavi per sessione, definire se la sessione viene attribuita alla landing page oppure può comparire in più gruppi: le sessioni per tipo di pagina non sono necessariamente additive.
5. Tenere separate le commissioni affiliate confermate dai clic. Questa modifica non importa vendite Amazon e non attribuisce commissioni alle sessioni.

La dimensione personalizzata non ricostruisce lo storico precedente. I dati GA4 rappresentano la popolazione misurabile secondo il consenso e non vanno equiparati a tutte le visite del sito.

## Verifiche in preview e negli account

- Controllare gli ID pubblici e gli slot effettivamente configurati nella preview; con CMP assente i servizi opzionali restano bloccati.
- Confermare nella configurazione Iubenda e negli strumenti AdSense che CMP, vendor e segnali TCF siano quelli richiesti per l'account. Le categorie `measurement`/`marketing` non dimostrano da sole la conformità TCF; questa modifica non abilita né certifica tale integrazione.
- Verificare il consenso iniziale, solo misurazione, solo marketing, consenso completo e revoca. Nessuna preferenza deve concedere implicitamente l'altra finalità.
- Dopo aver disabilitato le page view da history in GA4, verificare una sola `page_view` per navigazione con gli strumenti di debug. Controllare i valori reali di `page_type` e il titolo su articoli caricati in streaming.
- Verificare gli annunci con gli strumenti di test del provider, senza cliccare annunci reali o generare impression artificiali.

## Validazione locale

- `npm run typecheck`, `npm run lint`, `npm test`.
- Build webpack completata con ID di test e API contenuti intenzionalmente non disponibili: valida compilazione, tipi e prerender, non la connessione ai dati di produzione.
- Fixture Next.js con i componenti reali e Chromium, usando script CMP/Google/Clarity simulati: stato della pagina preservato, nessun caricamento prima del consenso, consenso solo misurazione, aggiunta marketing senza duplicazione, navigazione A → B → indietro → avanti, query, revoca e nuovo consenso. Risultato: sei page view manuali, otto richieste slot e nessun errore JavaScript.
- Script AdSense trattenuto durante A → B e rilasciato dopo la navigazione: richieste soltanto per i due slot di B, nessun push per i nodi rimossi di A.

Le simulazioni verificano il ciclo di vita dell'app, non il comportamento effettivo degli SDK pubblicitari, la configurazione degli account o i ricavi.
