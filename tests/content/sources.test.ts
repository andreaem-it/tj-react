import { test } from "node:test";
import assert from "node:assert/strict";
import { extractSources } from "@/lib/content/sources";

test("riconosce un editore noto e restituisce l'href reale", () => {
  const sources = extractSources(
    '<p>Secondo <a href="https://www.bloomberg.com/news/articles/example">Bloomberg</a>, ' +
      "Apple starebbe lavorando a un nuovo chip.</p>",
  );
  assert.deepEqual(sources, [
    { name: "Bloomberg", url: "https://www.bloomberg.com/news/articles/example" },
  ]);
});

test("un dominio sconosciuto compare con il proprio hostname", () => {
  const sources = extractSources('<p>Fonte: <a href="https://blog.esempio.dev/post">qui</a>.</p>');
  assert.deepEqual(sources, [{ name: "blog.esempio.dev", url: "https://blog.esempio.dev/post" }]);
});

test("i link verso il sito stesso non sono fonti", () => {
  const sources = extractSources('<p><a href="https://www.techjournal.it/apple">Apple</a></p>');
  assert.deepEqual(sources, []);
});

test("i link Amazon sono prodotti, non citazioni editoriali", () => {
  const sources = extractSources(
    '<p><a href="https://www.amazon.it/dp/B0EXAMPLE">Compralo qui</a></p>' +
      '<p><a href="https://amzn.to/xyz">offerta</a></p>',
  );
  assert.deepEqual(sources, []);
});

test("un'ancora interna (#id) non è una fonte esterna", () => {
  const sources = extractSources('<p><a href="#sezione-2">vai alla sezione</a></p>');
  assert.deepEqual(sources, []);
});

test("dedup per host + percorso, mantiene la prima occorrenza", () => {
  const sources = extractSources(
    '<p><a href="https://www.reuters.com/tech/example">prima</a> e poi ' +
      '<a href="https://reuters.com/tech/example?utm=1">di nuovo</a></p>',
  );
  assert.equal(sources.length, 1);
  assert.equal(sources[0].url, "https://www.reuters.com/tech/example");
});

test("un articolo senza link esterni non produce fonti", () => {
  assert.deepEqual(extractSources("<p>Nessun link qui.</p>"), []);
  assert.deepEqual(extractSources(""), []);
});

test("HTML malformato non lancia", () => {
  assert.doesNotThrow(() => extractSources('<p><a href="https://esempio.it/pagina">rotto'));
});
