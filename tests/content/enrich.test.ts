import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyArticleTopics } from "@/lib/content/enrich";

test("classifica un articolo dal contenuto completo, non solo titolo/estratto", () => {
  // "iPhone" compare due volte, solo nel corpo: sotto MIN_CONTENT_HITS=1 non
  // basterebbe, ma con due menzioni supera la soglia pensata per non
  // taggare un argomento su una citazione incidentale isolata. Il punto del
  // test è che titolo ed estratto da soli (classifyPost) non lo vedrebbero
  // affatto: serve il contenuto completo, che solo classifyArticleTopics legge.
  const result = classifyArticleTopics({
    title: "Novità in arrivo per gli utenti Apple",
    excerpt: "Un aggiornamento importante.",
    content:
      "<p>Il nuovo <strong>iPhone</strong> introduce funzioni inedite per la fotocamera " +
      "e la batteria. Il produttore ha confermato che l'iPhone sarà disponibile da subito, " +
      "secondo quanto riportato da fonti vicine ad Apple.</p>",
    categorySlug: "apple",
  });

  assert.ok(result.topicSlugs.includes("iphone"));
  assert.equal(typeof result.contentType, "string");
  assert.equal(typeof result.reliability, "string");
});

test("nessun topic riconoscibile → lista vuota, non un errore", () => {
  const result = classifyArticleTopics({
    title: "Aggiornamento di servizio",
    content: "<p>Manutenzione programmata del sito questa notte.</p>",
  });

  assert.deepEqual(result.topicSlugs, []);
});

test("HTML malformato non lancia: la classificazione degrada, non fallisce", () => {
  assert.doesNotThrow(() => {
    classifyArticleTopics({
      title: "Titolo",
      content: "<p>Paragrafo senza chiusura <strong>enfasi",
    });
  });
});
