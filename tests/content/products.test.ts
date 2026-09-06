import assert from "node:assert/strict";
import { test } from "node:test";
import {
  describedProductPart,
  extractAsins,
  matchProductsToArticle,
  productTopics,
  type MatchableProduct,
} from "@/lib/content/products";
import { getTopic } from "@/lib/content/topics";
import type { Topic } from "@/lib/content/types";

function topics(...slugs: string[]): Topic[] {
  return slugs.map((slug) => {
    const topic = getTopic(slug);
    assert.ok(topic, `topic inesistente nel test: ${slug}`);
    return topic;
  });
}

const iphone17: MatchableProduct = {
  id: 31,
  asin: "B0FQ8YZ1KP",
  title: "Apple iPhone 17 Pro 256 GB: display 6,3 pollici, chip A19 Pro",
};
const fireStick: MatchableProduct = {
  id: 8,
  asin: "B0CW4HD359",
  title: "Fire TV Stick 4K Max di Amazon (Ultimo modello), Dispositivo per lo streaming",
};
const airpods: MatchableProduct = {
  id: 50,
  asin: "B0D1XD1ZV3",
  title: "Apple AirPods Pro 3 con cancellazione del rumore",
};

const CATALOGO = [iphone17, fireStick, airpods];

// ---------------------------------------------------------------------------
// Estrazione ASIN
// ---------------------------------------------------------------------------

test("riconosce l'ASIN nelle forme di URL Amazon che WordPress produce", () => {
  const html = `
    <a href="https://www.amazon.it/dp/B0CW4HD359?tag=techjournal-it-21">offerta</a>
    <a href="https://www.amazon.it/gp/product/B0D1XD1ZV3">altra</a>
    <a href="https://www.amazon.it/Fire-TV-Stick/dp/B0FQ8YZ1KP/ref=sr_1_1">terza</a>
  `;
  assert.deepEqual(
    [...extractAsins(html)].sort(),
    ["B0CW4HD359", "B0D1XD1ZV3", "B0FQ8YZ1KP"],
  );
});

test("riconosce l'ASIN come parametro di query", () => {
  assert.ok(extractAsins("https://www.amazon.it/x?asin=B0CW4HD359").has("B0CW4HD359"));
});

test("riconosce un ASIN citato nel testo", () => {
  assert.ok(extractAsins("<p>Il codice prodotto è B0CW4HD359.</p>").has("B0CW4HD359"));
});

test("un articolo senza riferimenti non produce ASIN", () => {
  assert.equal(extractAsins("<p>Apple ha annunciato iOS 27.</p>").size, 0);
  assert.equal(extractAsins("").size, 0);
});

// ---------------------------------------------------------------------------
// Topic di prodotto
// ---------------------------------------------------------------------------

test("dal titolo di catalogo estrae il modello", () => {
  assert.deepEqual(productTopics(iphone17.title).map((t) => t.slug), ["iphone-17"]);
});

test("scarta i topic che non identificano un oggetto acquistabile", () => {
  // "Fire TV Stick 4K Max di Amazon" colpisce l'azienda Amazon: corretto come
  // entità, inutile come prodotto associabile.
  assert.deepEqual(productTopics(fireStick.title), []);
});

test("un titolo assente non produce topic", () => {
  assert.deepEqual(productTopics(null), []);
  assert.deepEqual(productTopics("   "), []);
});

test("l'elenco delle compatibilità non definisce il prodotto", () => {
  // Falso positivo osservato in produzione: questo caricatore compariva sotto
  // un articolo su iPhone 18 Pro.
  assert.deepEqual(
    productTopics(
      "Anker Caricatore USB C 47 W, caricatore 523 (Nano 3), compatibile con iPhone 17, iPad",
    ),
    [],
  );
  assert.deepEqual(productTopics("Custodia per iPhone 15 in silicone"), []);
  assert.deepEqual(productTopics("Cover progettata per iPhone 17 Pro Max"), []);
});

test("il taglio non tocca il nome del prodotto", () => {
  assert.deepEqual(
    productTopics("Apple iPhone 17 Pro 256 GB: display 6,3 pollici, ProMotion").map((t) => t.slug),
    ["iphone-17"],
  );
  assert.deepEqual(
    productTopics("Apple AirPods Max 2, Cuffie wireless over-ear").map((t) => t.slug),
    ["airpods"],
  );
});

test("describedProductPart tiene tutto quando non c'è alcun marcatore", () => {
  const titolo = "Apple iPhone 17 Pro 256 GB";
  assert.equal(describedProductPart(titolo), titolo);
});

// ---------------------------------------------------------------------------
// Associazione articolo → prodotto
// ---------------------------------------------------------------------------

test("l'ASIN nell'articolo vince su tutto", () => {
  const matches = matchProductsToArticle(CATALOGO, {
    contentHtml: '<a href="https://www.amazon.it/dp/B0CW4HD359">offerta</a>',
    articleTopics: [],
  });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].product.id, 8);
  assert.equal(matches[0].reason, "asin");
});

test("il topic condiviso associa il prodotto giusto", () => {
  const matches = matchProductsToArticle(CATALOGO, {
    articleTopics: topics("iphone-17"),
  });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].product.id, 31);
  assert.equal(matches[0].reason, "topic");
  assert.equal(matches[0].topic?.slug, "iphone-17");
});

test("un'azienda in comune non basta per associare un prodotto", () => {
  // È il falso positivo che rende inutilizzabile il matching ingenuo: articolo
  // e prodotto parlano entrambi di Apple, ma di due cose diverse.
  const matches = matchProductsToArticle(CATALOGO, { articleTopics: topics("apple") });
  assert.deepEqual(matches, []);
});

test("un argomento software non trascina prodotti", () => {
  assert.deepEqual(matchProductsToArticle(CATALOGO, { articleTopics: topics("ios-27") }), []);
});

test("l'ASIN precede il topic nell'ordine dei risultati", () => {
  const matches = matchProductsToArticle(CATALOGO, {
    contentHtml: '<a href="https://www.amazon.it/dp/B0CW4HD359">offerta</a>',
    articleTopics: topics("iphone-17"),
  });
  assert.deepEqual(
    matches.map((m) => m.reason),
    ["asin", "topic"],
  );
});

test("lo stesso prodotto non viene associato due volte", () => {
  const matches = matchProductsToArticle(CATALOGO, {
    contentHtml: '<a href="https://www.amazon.it/dp/B0FQ8YZ1KP">iPhone 17 Pro</a>',
    articleTopics: topics("iphone-17"),
  });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].reason, "asin");
});

test("il numero di prodotti mostrati è limitato", () => {
  const many = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    asin: `B0TEST${String(i).padStart(4, "0")}`,
    title: "Apple iPhone 17 Pro",
  }));
  assert.equal(matchProductsToArticle(many, { articleTopics: topics("iphone-17") }).length, 2);
  assert.equal(
    matchProductsToArticle(many, { articleTopics: topics("iphone-17") }, 1).length,
    1,
  );
});

test("catalogo vuoto e limite nullo non producono nulla", () => {
  assert.deepEqual(matchProductsToArticle([], { articleTopics: topics("iphone-17") }), []);
  assert.deepEqual(matchProductsToArticle(CATALOGO, { articleTopics: topics("iphone-17") }, 0), []);
});
