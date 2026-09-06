import assert from "node:assert/strict";
import { test } from "node:test";
import { findFirstMention, matchTopics, matchesTopic, primaryTopics } from "@/lib/content/match";
import { getTopic, TOPICS, topicHref } from "@/lib/content/topics";

function slugs(input: Parameters<typeof matchTopics>[0]): string[] {
  return matchTopics(input).map((m) => m.topic.slug);
}

function primarySlugs(input: Parameters<typeof matchTopics>[0]): string[] {
  return primaryTopics(matchTopics(input)).map((t) => t.slug);
}

// ---------------------------------------------------------------------------
// Titoli reali presi dal feed di produzione: sono i casi che il matcher deve
// risolvere, non esempi costruiti a tavolino.
// ---------------------------------------------------------------------------

test("assegna la release specifica, non solo la famiglia", () => {
  const found = slugs({
    title: "iOS 27: 30 nuove funzioni per iPhone, tra Siri contestuale e foto potenziate",
  });
  assert.ok(found.includes("ios-27"));
  assert.ok(found.includes("ios"), "la famiglia resta nel grafo delle entità");
  assert.ok(found.includes("siri"));
});

test("primaryTopics elimina la famiglia implicata dalla release", () => {
  const primary = primarySlugs({ title: "iOS 27 Beta 5: nuovi icon per Siri, Safari, Impostazioni" });
  assert.ok(primary.includes("ios-27"));
  assert.ok(!primary.includes("ios"), "iOS è già implicato da iOS 27");
});

test("primaryTopics elimina la famiglia implicata dal modello", () => {
  const primary = primarySlugs({ title: "iPhone 18 Pro: base storage a 256GB, nessun aumento rispetto al 17 Pro" });
  assert.ok(primary.includes("iphone-18"));
  assert.ok(!primary.includes("iphone"));
});

test("recupera l'argomento anche quando la categoria WordPress è un'altra", () => {
  // Questo articolo in produzione sta in `tecnologia`: la categoria non dice
  // che parla di tvOS 27 e watchOS 27, il testo sì.
  const primary = primarySlugs({ title: "tvOS 27 e watchOS 27: disponibili le terze beta pubbliche" });
  assert.ok(primary.includes("tvos-27"));
  assert.ok(primary.includes("watchos-27"));
});

test("rispetta il tetto di argomenti principali", () => {
  const primary = primarySlugs({
    title:
      "Apple, Google, Samsung, Microsoft, OpenAI e Nvidia: ChatGPT, Gemini e Copilot a confronto",
  });
  assert.ok(primary.length <= 4);
});

// ---------------------------------------------------------------------------
// Falsi positivi: la parte che rende il matcher utilizzabile su testo italiano
// ---------------------------------------------------------------------------

test("l'alias AI non colpisce la preposizione italiana «ai»", () => {
  const found = slugs({
    title: "Apple valuta una commissione fino al 15% per i link fuori dall'App Store",
    excerpt: "La misura si applicherebbe ai link esterni e ai pagamenti gestiti dagli sviluppatori.",
  });
  assert.ok(
    !found.includes("intelligenza-artificiale"),
    "«ai link», «ai pagamenti» non sono intelligenza artificiale",
  );
});

test("l'alias AI colpisce l'acronimo maiuscolo", () => {
  const found = slugs({ title: "Apple addestra un proprio modello AI per la Cina" });
  assert.ok(found.includes("intelligenza-artificiale"));
});

test("l'alias Pixel non colpisce l'unità di misura", () => {
  const found = slugs({
    title: "Il nuovo sensore arriva a 200 megapixel",
    excerpt: "Ogni pixel misura 0,6 micron e il pixel binning resta a quattro.",
  });
  assert.ok(!found.includes("pixel"));
});

test("l'alias Pixel colpisce il prodotto Google", () => {
  const found = slugs({ title: "Google presenta Pixel Tag da 29 dollari per sfidare AirTag" });
  assert.ok(found.includes("pixel"));
  assert.ok(found.includes("airtag"));
});

test("una singola menzione nel corpo non assegna un argomento", () => {
  const found = slugs({
    title: "Apple rilascia watchOS 27 Beta 5",
    content: "<p>La beta arriva dopo quella di Samsung dello scorso mese.</p>",
  });
  assert.ok(!found.includes("samsung"), "un riferimento di passaggio non è un argomento");
});

test("due menzioni nel corpo assegnano l'argomento", () => {
  const found = slugs({
    title: "Apple rilascia watchOS 27 Beta 5",
    content: "<p>Samsung resta il fornitore principale.</p><p>Per Samsung è il terzo anno.</p>",
  });
  assert.ok(found.includes("samsung"));
});

test("il confine di parola regge il testo accentato", () => {
  // Con `\b` di JavaScript "iOS" seguito da una lettera accentata darebbe un
  // falso confine di parola.
  const found = slugs({ title: "Il chip iOSè inventato non esiste" });
  assert.ok(!found.includes("ios"));
});

// ---------------------------------------------------------------------------
// Menzioni sovrapposte
// ---------------------------------------------------------------------------

test("alias sovrapposti contano come una sola menzione", () => {
  // "Apple Watch" e "Watch Ultra" colpiscono entrambi la stessa occorrenza: se
  // si sommassero le corrispondenze invece dei gruppi sovrapposti, `hits`
  // sarebbe 2 e una sola menzione supererebbe da sola la soglia del corpo.
  const [match] = matchTopics({ title: "Apple Watch Ultra in offerta" }).filter(
    (m) => m.topic.slug === "apple-watch",
  );
  assert.ok(match, "apple-watch deve essere rilevato");
  assert.equal(match.hits, 1);
});

test("una menzione sola nel corpo non basta nemmeno con alias sovrapposti", () => {
  const found = slugs({
    title: "Apple rilascia watchOS 27 Beta 5",
    content: "<p>Anche Apple Watch Ultra riceve l'aggiornamento.</p>",
  });
  assert.ok(!found.includes("apple-watch"));
});

test("findFirstMention preferisce l'alias più lungo a parità di posizione", () => {
  const appleWatch = getTopic("apple-watch");
  assert.ok(appleWatch);
  const mention = findFirstMention("Apple Watch Ultra 3", appleWatch);
  assert.deepEqual(mention, { index: 0, length: "Apple Watch".length });
});

test("matchesTopic filtra i risultati generosi della ricerca", () => {
  const ios27 = getTopic("ios-27");
  assert.ok(ios27);
  assert.ok(matchesTopic({ title: "iOS 27 Beta 6 disponibile" }, ios27));
  assert.ok(
    !matchesTopic({ title: "Apple rilascia le beta di iOS 26.6.1 e iPadOS 26.6.1" }, ios27),
    "iOS 26 non è iOS 27",
  );
});

// ---------------------------------------------------------------------------
// Integrità del registry
// ---------------------------------------------------------------------------

test("gli slug del registry sono unici", () => {
  const seen = new Set<string>();
  for (const topic of TOPICS) {
    assert.ok(!seen.has(topic.slug), `slug duplicato: ${topic.slug}`);
    seen.add(topic.slug);
  }
});

test("parent e related puntano a slug esistenti", () => {
  for (const topic of TOPICS) {
    if (topic.parent) {
      assert.ok(getTopic(topic.parent), `${topic.slug}: parent inesistente ${topic.parent}`);
    }
    for (const slug of topic.related ?? []) {
      assert.ok(getTopic(slug), `${topic.slug}: related inesistente ${slug}`);
    }
  }
});

test("ogni topic ha una destinazione: hub oppure archivio di categoria", () => {
  for (const topic of TOPICS) {
    assert.ok(topicHref(topic), `${topic.slug} non è raggiungibile da nessun link`);
  }
});

test("nessun alias vuoto o composto da soli spazi", () => {
  for (const topic of TOPICS) {
    assert.ok(topic.aliases.length > 0, `${topic.slug} non ha alias`);
    for (const alias of topic.aliases) {
      const text = typeof alias === "string" ? alias : alias.text;
      assert.ok(text.trim().length > 0, `${topic.slug} ha un alias vuoto`);
    }
  }
});
