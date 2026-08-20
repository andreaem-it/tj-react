import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFaq } from "@/lib/content/faq";
import type { TocEntry } from "@/lib/content/types";

test("estrae domanda e risposta da un heading interrogativo", () => {
  const html =
    '<h2 id="quali-iphone-supportano-ios-27">Quali iPhone supportano iOS 27?</h2>' +
    "<p>Tutti i modelli da iPhone 12 in poi ricevono l'aggiornamento ufficiale.</p>" +
    '<h2 id="altra-sezione">Altra sezione</h2>' +
    "<p>Testo che non deve entrare nella risposta precedente.</p>";
  const toc: TocEntry[] = [
    { id: "quali-iphone-supportano-ios-27", text: "Quali iPhone supportano iOS 27?", level: 2 },
    { id: "altra-sezione", text: "Altra sezione", level: 2 },
  ];

  const faq = extractFaq(html, toc);

  assert.equal(faq.length, 1);
  assert.equal(faq[0].id, "quali-iphone-supportano-ios-27");
  assert.equal(faq[0].question, "Quali iPhone supportano iOS 27?");
  assert.equal(
    faq[0].answer,
    "Tutti i modelli da iPhone 12 in poi ricevono l'aggiornamento ufficiale.",
  );
  // La sezione successiva non deve trapelare nella risposta.
  assert.ok(!faq[0].answer.includes("non deve entrare"));
});

test("un heading non interrogativo non produce una voce FAQ", () => {
  const html = '<h2 id="novita">Le novità di iOS 27</h2><p>Testo.</p>';
  const toc: TocEntry[] = [{ id: "novita", text: "Le novità di iOS 27", level: 2 }];

  assert.deepEqual(extractFaq(html, toc), []);
});

test("l'ultima domanda dell'articolo prende il testo fino alla fine", () => {
  const html =
    '<h2 id="conviene">Conviene aggiornare subito?</h2><p>Sì, non ci sono controindicazioni note.</p>';
  const toc: TocEntry[] = [{ id: "conviene", text: "Conviene aggiornare subito?", level: 2 }];

  const faq = extractFaq(html, toc);
  assert.equal(faq.length, 1);
  assert.equal(faq[0].answer, "Sì, non ci sono controindicazioni note.");
});

test("la risposta viene troncata su un confine di parola, non a metà", () => {
  const longAnswer = "Parola ".repeat(60).trim(); // ben oltre MAX_ANSWER_CHARS
  const html = `<h2 id="lunga">Domanda lunga?</h2><p>${longAnswer}</p>`;
  const toc: TocEntry[] = [{ id: "lunga", text: "Domanda lunga?", level: 2 }];

  const faq = extractFaq(html, toc);
  assert.ok(faq[0].answer.endsWith("…"));
  assert.ok(!faq[0].answer.slice(0, -1).endsWith(" "));
  assert.ok(faq[0].answer.length <= 282);
});

test("nessun heading interrogativo → nessuna FAQ", () => {
  assert.deepEqual(extractFaq("<p>Testo qualunque.</p>", []), []);
});

test("HTML malformato non lancia", () => {
  assert.doesNotThrow(() =>
    extractFaq('<h2 id="rotto">Domanda senza chiusura?', [
      { id: "rotto", text: "Domanda senza chiusura?", level: 2 },
    ]),
  );
});
