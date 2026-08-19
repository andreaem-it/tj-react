import assert from "node:assert/strict";
import { test } from "node:test";
import {
  emptyPersonalData,
  findWatchedProduct,
  followTopic,
  hasReachedTarget,
  isArticleSaved,
  isEmpty,
  isFollowingTopic,
  markTopicSeen,
  parsePersonalData,
  PERSONAL_DATA_VERSION,
  saveArticle,
  serializePersonalData,
  unfollowTopic,
  unsaveArticle,
  unwatchProduct,
  watchProduct,
} from "@/lib/personal/store";

const NOW = Date.UTC(2026, 7, 18, 12, 0, 0);
const LATER = NOW + 3_600_000;

// ---------------------------------------------------------------------------
// Lettura difensiva: i dati vengono da localStorage, cioè da chiunque
// ---------------------------------------------------------------------------

test("dati assenti o vuoti producono uno stato iniziale", () => {
  assert.deepEqual(parsePersonalData(null), emptyPersonalData());
  assert.deepEqual(parsePersonalData(""), emptyPersonalData());
  assert.deepEqual(parsePersonalData("   "), emptyPersonalData());
});

test("JSON non valido non fa lanciare nulla", () => {
  assert.deepEqual(parsePersonalData("{non json"), emptyPersonalData());
  assert.deepEqual(parsePersonalData("[]"), emptyPersonalData());
  assert.deepEqual(parsePersonalData("null"), emptyPersonalData());
  assert.deepEqual(parsePersonalData('"stringa"'), emptyPersonalData());
});

test("una versione diversa riparte da zero invece di indovinare", () => {
  const raw = JSON.stringify({ version: 999, topics: [{ slug: "ios-27" }] });
  assert.deepEqual(parsePersonalData(raw), emptyPersonalData());
});

test("una voce malformata costa quella voce, non l'intera funzionalità", () => {
  const raw = JSON.stringify({
    version: PERSONAL_DATA_VERSION,
    topics: [{ slug: "ios-27", addedAt: NOW, lastSeenAt: NOW }, { slug: "" }, null, 42],
    articles: [
      { id: 1, path: "/apple/x", title: "Titolo", savedAt: NOW },
      { id: "non-numero", path: "/y" },
      { path: "/senza-id" },
    ],
    products: [{ asin: "b0cw4hd359", title: "Fire TV", targetPrice: 40, addedAt: NOW }],
  });
  const data = parsePersonalData(raw);
  assert.deepEqual(data.topics.map((t) => t.slug), ["ios-27"]);
  assert.deepEqual(data.articles.map((a) => a.id), [1]);
  // L'ASIN viene normalizzato in maiuscolo: è un identificativo, non testo.
  assert.equal(data.products[0].asin, "B0CW4HD359");
});

test("i campi numerici mancanti diventano zero senza propagare NaN", () => {
  const raw = JSON.stringify({
    version: PERSONAL_DATA_VERSION,
    topics: [{ slug: "siri" }],
    articles: [{ id: 7, path: "/apple/z" }],
    products: [{ asin: "B0TEST0001", targetPrice: "molto poco" }],
  });
  const data = parsePersonalData(raw);
  assert.equal(data.topics[0].addedAt, 0);
  assert.equal(data.articles[0].savedAt, 0);
  assert.equal(data.articles[0].title, "/apple/z", "senza titolo si usa il percorso");
  assert.equal(data.products[0].targetPrice, null, "una soglia non numerica non è una soglia");
});

test("scrittura e rilettura conservano i dati", () => {
  let data = emptyPersonalData();
  data = followTopic(data, "ios-27", NOW);
  data = saveArticle(data, { id: 1, path: "/apple/x", title: "Titolo" }, NOW);
  data = watchProduct(data, { asin: "B0CW4HD359", title: "Fire TV", targetPrice: 45 }, NOW);
  assert.deepEqual(parsePersonalData(serializePersonalData(data)), data);
});

// ---------------------------------------------------------------------------
// Argomenti seguiti
// ---------------------------------------------------------------------------

test("seguire e smettere di seguire un argomento", () => {
  let data = emptyPersonalData();
  assert.equal(isFollowingTopic(data, "ios-27"), false);
  data = followTopic(data, "ios-27", NOW);
  assert.equal(isFollowingTopic(data, "ios-27"), true);
  data = unfollowTopic(data, "ios-27");
  assert.equal(isFollowingTopic(data, "ios-27"), false);
});

test("seguire due volte non duplica", () => {
  let data = followTopic(emptyPersonalData(), "ios-27", NOW);
  data = followTopic(data, "ios-27", LATER);
  assert.equal(data.topics.length, 1);
  assert.equal(data.topics[0].addedAt, NOW, "la data originale non cambia");
});

test("operazioni su voci inesistenti restituiscono lo stesso oggetto", () => {
  const data = emptyPersonalData();
  assert.equal(unfollowTopic(data, "assente"), data);
  assert.equal(unsaveArticle(data, 99), data);
  assert.equal(unwatchProduct(data, "B0NONESISTE"), data);
  assert.equal(markTopicSeen(data, "assente", NOW), data);
  assert.equal(followTopic(data, "  ", NOW), data);
});

test("segnare come visto aggiorna solo l'argomento indicato", () => {
  let data = followTopic(followTopic(emptyPersonalData(), "ios-27", NOW), "siri", NOW);
  data = markTopicSeen(data, "ios-27", LATER);
  assert.equal(data.topics.find((t) => t.slug === "ios-27")!.lastSeenAt, LATER);
  assert.equal(data.topics.find((t) => t.slug === "siri")!.lastSeenAt, NOW);
});

// ---------------------------------------------------------------------------
// Articoli salvati
// ---------------------------------------------------------------------------

test("salvare e togliere un articolo", () => {
  let data = emptyPersonalData();
  data = saveArticle(data, { id: 10, path: "/apple/a", title: "A" }, NOW);
  assert.ok(isArticleSaved(data, 10));
  data = unsaveArticle(data, 10);
  assert.equal(isArticleSaved(data, 10), false);
});

test("i salvati più recenti stanno per primi", () => {
  let data = saveArticle(emptyPersonalData(), { id: 1, path: "/a", title: "A" }, NOW);
  data = saveArticle(data, { id: 2, path: "/b", title: "B" }, LATER);
  assert.deepEqual(data.articles.map((a) => a.id), [2, 1]);
});

test("salvare due volte lo stesso articolo non duplica", () => {
  let data = saveArticle(emptyPersonalData(), { id: 1, path: "/a", title: "A" }, NOW);
  data = saveArticle(data, { id: 1, path: "/a", title: "A" }, LATER);
  assert.equal(data.articles.length, 1);
});

test("la raccolta non cresce senza limite", () => {
  let data = emptyPersonalData();
  for (let i = 0; i < 260; i += 1) {
    data = saveArticle(data, { id: i, path: `/p/${i}`, title: `T${i}` }, NOW + i);
  }
  assert.equal(data.articles.length, 200);
  // Si scarta il più vecchio, la voce che l'utente ha meno probabilità di rivolere.
  assert.ok(data.articles.some((a) => a.id === 259));
  assert.ok(!data.articles.some((a) => a.id === 0));
});

// ---------------------------------------------------------------------------
// Prodotti e soglia di prezzo
// ---------------------------------------------------------------------------

test("osservare un prodotto con una soglia", () => {
  const data = watchProduct(
    emptyPersonalData(),
    { asin: "b0cw4hd359", title: "Fire TV", targetPrice: 45 },
    NOW,
  );
  const product = findWatchedProduct(data, "B0CW4HD359")!;
  assert.equal(product.targetPrice, 45);
  assert.equal(product.asin, "B0CW4HD359");
});

test("ri-osservare aggiorna la soglia e conserva la data", () => {
  let data = watchProduct(emptyPersonalData(), { asin: "B0X", title: "X", targetPrice: 50 }, NOW);
  data = watchProduct(data, { asin: "B0X", title: "X aggiornato", targetPrice: 40 }, LATER);
  assert.equal(data.products.length, 1);
  assert.equal(data.products[0].targetPrice, 40);
  assert.equal(data.products[0].addedAt, NOW);
});

test("una soglia non valida equivale a nessuna soglia", () => {
  for (const target of [0, -10, Number.NaN]) {
    const data = watchProduct(emptyPersonalData(), { asin: "B0X", title: "X", targetPrice: target }, NOW);
    assert.equal(data.products[0].targetPrice, null);
  }
});

test("la soglia raggiunta è una constatazione, non una stima", () => {
  const conSoglia = { asin: "B0X", title: "X", targetPrice: 50, addedAt: NOW };
  assert.equal(hasReachedTarget(conSoglia, 49.99), true);
  assert.equal(hasReachedTarget(conSoglia, 50), true);
  assert.equal(hasReachedTarget(conSoglia, 50.01), false);
});

test("senza soglia o senza prezzo non si afferma nulla", () => {
  const senzaSoglia = { asin: "B0X", title: "X", targetPrice: null, addedAt: NOW };
  assert.equal(hasReachedTarget(senzaSoglia, 10), false);
  const conSoglia = { asin: "B0X", title: "X", targetPrice: 50, addedAt: NOW };
  assert.equal(hasReachedTarget(conSoglia, null), false);
  assert.equal(hasReachedTarget(conSoglia, 0), false);
});

// ---------------------------------------------------------------------------
// Stato iniziale
// ---------------------------------------------------------------------------

test("isEmpty distingue lo stato iniziale da quello popolato", () => {
  assert.equal(isEmpty(emptyPersonalData()), true);
  assert.equal(isEmpty(followTopic(emptyPersonalData(), "ios-27", NOW)), false);
});
