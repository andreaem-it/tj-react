# Blocchi editoriali nel contenuto (§58)

Sette blocchi in evidenza usabili dentro un articolo: **Aggiornamento**, **Da
sapere**, **TechJournal consiglia**, **Dato**, **Attenzione**, **Rumor**,
**Confermato**. Nessuna sintassi nuova da imparare: si applicano con il
meccanismo nativo di Gutenberg per aggiungere una classe CSS a un blocco.

## Come si usa

1. Nell'editor di WordPress, seleziona il blocco (paragrafo, gruppo, citazione…)
   che vuoi trasformare in un riquadro in evidenza.
2. Apri il pannello laterale **Impostazioni** del blocco → sezione
   **Avanzate** → campo **"Classi CSS aggiuntive"**.
3. Scrivi due classi separate da uno spazio: `tj-callout` (obbligatoria, attiva
   lo stile) e una delle sette varianti qui sotto.

| Scrivi nel campo "Classi CSS aggiuntive" | Effetto |
|---|---|
| `tj-callout tj-callout--aggiornamento` | Aggiornamento (blu) |
| `tj-callout tj-callout--da-sapere` | Da sapere (viola) |
| `tj-callout tj-callout--consiglio` | TechJournal consiglia (ambra, colore di brand) |
| `tj-callout tj-callout--dato` | Dato (neutro) |
| `tj-callout tj-callout--attenzione` | Attenzione (ambra/arancio) |
| `tj-callout tj-callout--rumor` | Rumor (ambra/arancio) |
| `tj-callout tj-callout--confermato` | Confermato (verde) |

L'etichetta ("Aggiornamento", "Rumor", ecc.) compare **da sola**, generata dal
CSS: scrivi solo il testo del blocco, non l'etichetta.

## Perché così

- Non serve un parser né una sintassi custom lato frontend: il campo
  "Classi CSS aggiuntive" è già nell'editor, per ogni blocco, da sempre.
  `sanitizeRichHtml` (`lib/sanitizeRichHtml.ts`) mantiene l'attributo `class`
  fra quelli consentiti, quindi arriva intatto fino al sito pubblicato.
- Le regole vivono in `app/globals.css`, scoperte sotto
  `.article-body-wrapper .article-content .tj-callout` — non hanno effetto
  fuori dal corpo di un articolo.
- Verificato visivamente in locale, tema chiaro e scuro, su un articolo reale
  (2026-08-21).

## Non abusarne

Come per gli argomenti in `ArticleTopics` e i link interni: un blocco per
concetto, non uno per paragrafo. Un articolo con dieci riquadri in evidenza
non ha più nulla in evidenza.
