import assert from "node:assert/strict";
import { test } from "node:test";
import type { PostListItem } from "@/lib/api";
import { classifyPost } from "@/lib/content/classify";
import {
  buildStoryTimeline,
  isCorrelatingTopic,
  rankRelated,
  type RelatedCandidate,
} from "@/lib/content/related";
import { getTopic } from "@/lib/content/topics";

const NOW = Date.UTC(2026, 7, 17, 12, 0, 0);
const HOUR = 3_600_000;

let nextId = 1;
function candidate(title: string, hoursAgo: number, categorySlug = "apple"): RelatedCandidate {
  const post: PostListItem = {
    id: nextId++,
    date: new Date(NOW - hoursAgo * HOUR).toISOString(),
    slug: `post-${nextId}`,
    title,
    excerpt: "",
    categoryName: "Apple",
    categorySlug,
    categoryId: 2,
    imageUrl: null,
    imageAlt: "",
    authorName: "Redazione",
    authorAvatarUrl: null,
    viewCount: 0,
  };
  return { post, classification: classifyPost({ title, categorySlug }) };
}

// ---------------------------------------------------------------------------
// Specificità: la regola che rende utilizzabile la correlazione
// ---------------------------------------------------------------------------

test("un'azienda in comune non correla due articoli", () => {
  // Caso reale: su cento articoli le prime sei coppie candidate condividevano
  // soltanto `apple`, e comprendevano "visionOS 27 beta" accostato a "tvOS 27
  // beta" — due prodotti diversi.
  assert.equal(isCorrelatingTopic(getTopic("apple")!), false);

  const base = candidate("Apple rilascia la quinta beta di visionOS 27 agli sviluppatori", 1);
  const altro = candidate("Apple rilascia la quinta beta di tvOS 27 agli sviluppatori", 2);
  assert.deepEqual(rankRelated(base, [altro], { now: NOW }), []);
});

test("gli archivi larghi non correlano, gli argomenti specifici sì", () => {
  // `iphone` e `ios` duplicano un archivio di categoria: sono larghi per
  // costruzione, ed è la ragione per cui non hanno una pagina propria.
  assert.equal(isCorrelatingTopic(getTopic("iphone")!), false);
  assert.equal(isCorrelatingTopic(getTopic("ios")!), false);
  assert.equal(isCorrelatingTopic(getTopic("ios-27")!), true);
  assert.equal(isCorrelatingTopic(getTopic("iphone-18")!), true);
  assert.equal(isCorrelatingTopic(getTopic("siri")!), true);
});

test("la specificità non dipende da quanti articoli ci sono nell'insieme", () => {
  // Se l'insieme è già filtrato per argomento — gli articoli di un hub —
  // una regola basata sulla frequenza scarterebbe proprio l'argomento comune.
  const base = candidate("iOS 27 Beta 6 disponibile", 0);
  const pool = Array.from({ length: 10 }, (_, i) => candidate(`iOS 27: novità numero ${i}`, i + 1));
  assert.ok(rankRelated(base, pool, { now: NOW }).length > 0);
});

// ---------------------------------------------------------------------------
// Correlazione
// ---------------------------------------------------------------------------

test("gli articoli sullo stesso argomento specifico si correlano", () => {
  const base = candidate("iPhone 17: conviene comprarlo ora o aspettare iPhone 18?", 0);
  const pool = [
    candidate("iPhone 18 base verso due upgrade pro: cosa potrebbe cambiare", 18),
    candidate("Apple aggiorna Apple Pay in India", 20),
    candidate("Apple apre un nuovo store a Houston", 22),
    candidate("Apple rilascia watchOS 27 Beta 5", 24),
    candidate("Apple presenta i nuovi Mac mini", 26),
    candidate("Apple Maps introduce la pubblicità", 28),
  ];
  const related = rankRelated(base, pool, { now: NOW });
  assert.equal(related[0].title, "iPhone 18 base verso due upgrade pro: cosa potrebbe cambiare");
});

test("più argomenti in comune valgono più della vicinanza temporale", () => {
  const base = candidate("iPhone 18 e iOS 27: cosa aspettarsi", 0);
  const pool = [
    candidate("Apple Pay arriva in India", 1),
    candidate("iPhone 18 con iOS 27: le novità attese", 60),
    candidate("Apple apre a Houston", 2),
    candidate("Apple Maps con pubblicità", 3),
    candidate("Apple aggiorna i Mac", 4),
    candidate("Apple e la causa OpenAI", 5),
  ];
  const related = rankRelated(base, pool, { now: NOW });
  assert.equal(related[0].title, "iPhone 18 con iOS 27: le novità attese");
});

test("senza argomenti in comune non si restituisce nulla", () => {
  // Meglio nessun correlato che un elenco riempito con articoli casuali.
  const base = candidate("Sony annuncia nuove cuffie", 0);
  const pool = [
    candidate("Apple rilascia iOS 27 beta", 1),
    candidate("Apple Pay in India", 2),
    candidate("Apple apre a Houston", 3),
    candidate("Apple Maps con pubblicità", 4),
    candidate("Apple aggiorna i Mac", 5),
    candidate("Apple e OpenAI", 6),
  ];
  assert.deepEqual(rankRelated(base, pool, { now: NOW }), []);
});

test("l'articolo stesso non compare fra i propri correlati", () => {
  const base = candidate("iOS 27 beta 6 disponibile", 0);
  const related = rankRelated(base, [base], { now: NOW });
  assert.deepEqual(related, []);
});

test("il limite viene rispettato", () => {
  const base = candidate("iOS 27 beta 6 disponibile", 0);
  const pool = Array.from({ length: 10 }, (_, i) => candidate(`iOS 27 novità numero ${i}`, i + 1));
  assert.equal(rankRelated(base, pool, { now: NOW, limit: 3 }).length, 3);
});

test("una data malformata non rompe l'ordinamento", () => {
  const base = candidate("iOS 27 beta 6 disponibile", 0);
  const rotto = candidate("iOS 27: le novità", 1);
  rotto.post.date = "non-una-data";
  const related = rankRelated(base, [rotto], { now: NOW });
  assert.equal(related.length, 1);
});

// ---------------------------------------------------------------------------
// Storia
// ---------------------------------------------------------------------------

test("gli sviluppi si dividono in precedenti e successivi", () => {
  const base = candidate("iOS 27 Beta 5: le novità", 24);
  const pool = [
    candidate("iOS 27 Beta 4 disponibile", 100),
    candidate("iOS 27 Beta 3 disponibile", 200),
    candidate("iOS 27 Beta 6 disponibile", 2),
  ];
  const story = buildStoryTimeline(base, pool)!;
  assert.equal(story.topic.slug, "ios-27");
  assert.deepEqual(story.previous.map((p) => p.title), [
    "iOS 27 Beta 4 disponibile",
    "iOS 27 Beta 3 disponibile",
  ]);
  assert.deepEqual(story.following.map((p) => p.title), ["iOS 27 Beta 6 disponibile"]);
  assert.equal(story.total, 4);
});

test("due articoli non sono una storia", () => {
  const base = candidate("iOS 27 Beta 5", 24);
  assert.equal(buildStoryTimeline(base, [candidate("iOS 27 Beta 4", 100)]), null);
});

test("senza argomento specifico non c'è storia", () => {
  const base = candidate("Apple apre un nuovo store", 1);
  const pool = [
    candidate("Apple presenta i Mac", 2),
    candidate("Apple Pay in India", 3),
    candidate("Apple Maps con pubblicità", 4),
    candidate("Apple a Houston", 5),
    candidate("Apple e OpenAI", 6),
  ];
  assert.equal(buildStoryTimeline(base, pool), null);
});

test("il limite degli sviluppi mostrati è rispettato", () => {
  const base = candidate("iOS 27 Beta 5", 50);
  const pool = Array.from({ length: 12 }, (_, i) => candidate(`iOS 27 Beta ${i}`, 60 + i * 10));
  const story = buildStoryTimeline(base, pool, { limit: 3 })!;
  assert.equal(story.previous.length, 3);
  assert.equal(story.total, 13);
});
