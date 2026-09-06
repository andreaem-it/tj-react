# Apple Event 2026 — runbook editoriale

Data confermata da Apple: **mercoledì 9 settembre 2026, ore 19:00 CEST** (10:00 PT). Fonti primarie: [Apple Event](https://www.apple.com/apple-events/), [Apple Newsroom](https://www.apple.com/newsroom/) e [Apple Developer News](https://developer.apple.com/news/).

## Responsabilità operative

- **Caporedattore di turno:** decide priorità, apre/chiude la breaking bar, autorizza pubblicazione e rollback manuale.
- **Live editor:** segue lo stream Apple, aggiorna il live e registra orario/fonte di ogni annuncio.
- **Schede prodotto:** aggiorna Compatibility e verifica Price Radar soltanto dopo disponibilità commerciale confermata.
- **Distribuzione:** prepara newsletter e push, controlla titolo, URL, immagine e consenso finale del caporedattore.

I nomi e i recapiti vanno assegnati nel briefing del 7 settembre; l’assenza di un ruolo blocca soltanto il relativo canale, non l’intero sito.

## Prima dell’evento

- Entro 7 settembre: verificare gli hub `/topic/apple-event`, `/topic/apple`, `/topic/iphone`, `/topic/iphone-18`, `/topic/apple-watch` e `/topic/airpods`; aggiornare o creare gli evergreen “come seguire”, “modelli a confronto” e “disponibilità/prezzi”.
- Entro 8 settembre: predisporre bozze distinte per live, riepilogo, iPhone, Apple Watch, AirPods e software; non inserire specifiche rumor come fatti.
- Preparare immagini in formato 16:9 e 1:1 da asset Apple autorizzati, con alt text descrittivo; tenere un’immagine neutra di fallback.
- Preparare una newsletter in bozza usando il digest esistente. Oggetto di fallback: “Apple Event 2026: tutti gli annunci”.
- Eseguire smoke test di breaking, pubblicazione WordPress, invalidazione frontend, player audio e rollback.

## Durante l’evento

1. Alle 18:45 aprire la breaking con link al live; scadenza automatica consigliata alle 22:30.
2. Usare solo stream Apple e comunicati Newsroom come fonte primaria. Una seconda fonte serve soltanto per contesto o problemi di accesso.
3. Pubblicare prima il live, poi articoli verticali. Ogni specifica incerta resta marcata come non confermata.
4. Se l’autoposter produce un errore, disabilitare il relativo flag e passare alla bozza manuale; non rilanciare in loop durante il keynote.
5. Per ogni articolo controllare autore, categoria primaria, topic, canonical, immagine, TL;DR, fonti e link prima della pubblicazione.

## Dopo l’evento

- Entro 30 minuti: riepilogo degli annunci con link agli approfondimenti.
- Entro 2 ore: aggiornare Compatibility con soli modelli/versioni confermati e Price Radar con prodotti realmente acquistabili.
- Entro 3 ore: inviare newsletter e push dopo un controllo su dispositivo reale.
- Entro il giorno successivo: aggiornare evergreen, cronologia degli hub, confronti e correzioni; verificare cannibalizzazione e duplicati.

## Fallback e rollback

- **WordPress/API non disponibili:** scrivere nelle bozze locali, conservare fonti e orari, pubblicare in ordine cronologico al ripristino.
- **Frontend degradato:** mantenere WordPress come sorgente, sospendere breaking e distribuzione finché il contenuto non è visibile sul candidato.
- **AI non disponibile o qualità insufficiente:** lavorazione manuale; l’AI non è un requisito per la copertura.
- **TTS/R2 non disponibili:** pubblicare il testo e lasciare l’audio in coda; non bloccare la notizia.
- **Errore pubblicato:** ritirare o correggere in WordPress, compilare changelog/correzione e invalidare le cache; il caporedattore registra decisione e orario.
