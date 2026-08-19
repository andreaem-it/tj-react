import assert from "node:assert/strict";
import { test } from "node:test";
import type { PostListItem } from "@/lib/api";
import { prepareItems, rankHomeItems } from "@/lib/home/ranking";
import { composeDigest, MIN_DIGEST_ITEMS } from "@/lib/newsletter/digest";
import {
  renderDigestHtml,
  renderDigestSubject,
  renderDigestText,
} from "@/lib/newsletter/render";

const NOW = Date.UTC(2026, 7, 17, 18, 0, 0);
const HOUR = 3_600_000;
const START = new Date(NOW - 24 * HOUR);
const END = new Date(NOW);

let id = 1;
function post(title: string, hoursAgo: number, extra: Partial<PostListItem> = {}): PostListItem {
  return {
    id: id++,
    date: new Date(NOW - hoursAgo * HOUR).toISOString(),
    slug: `slug-${id}`,
    title,
    excerpt: `Sommario di ${title}.`,
    categoryName: "Apple",
    categorySlug: "apple",
    categoryId: 2,
    imageUrl: null,
    imageAlt: "",
    authorName: "Redazione",
    authorAvatarUrl: null,
    viewCount: 0,
    ...extra,
  };
}

function digestOf(posts: PostListItem[], maxItems?: number) {
  const ranked = rankHomeItems(prepareItems(posts), { now: NOW });
  return composeDigest(ranked, { periodStart: START, periodEnd: END, maxItems });
}

const OPTIONS = {
  siteUrl: "https://www.techjournal.it",
  unsubscribeUrl: "https://example.test/unsub?id=1",
};

// ---------------------------------------------------------------------------
// Finestra temporale
// ---------------------------------------------------------------------------

test("entrano solo gli articoli della finestra", () => {
  const digest = digestOf([
    post("Apple rilascia iOS 27 beta 6", 2),
    post("Apple presenta i nuovi Mac", 5),
    post("Apple Pay arriva in India", 10),
    post("Notizia di tre giorni fa", 72),
  ])!;
  assert.equal(digest.items.length, 3);
  assert.ok(!digest.items.some((i) => i.post.title.includes("tre giorni")));
});

test("una data malformata non entra e non rompe la composizione", () => {
  const rotto = post("Articolo con data rotta", 1);
  rotto.date = "non-una-data";
  const digest = digestOf([
    rotto,
    post("Apple rilascia iOS 27 beta 6", 2),
    post("Apple presenta i Mac", 3),
    post("Apple Pay in India", 4),
  ])!;
  assert.equal(digest.items.length, 3);
});

// ---------------------------------------------------------------------------
// Soglia minima
// ---------------------------------------------------------------------------

test("sotto la soglia minima non si compone alcun digest", () => {
  // Meglio saltare l'invio che spedire una newsletter da due voci.
  assert.equal(digestOf([post("Una notizia sola", 1)]), null);
  assert.equal(digestOf([post("Prima", 1), post("Seconda", 2)]), null);
  assert.ok(digestOf([post("Prima", 1), post("Seconda", 2), post("Terza", 3)]));
  assert.equal(MIN_DIGEST_ITEMS, 3);
});

test("una finestra vuota non produce nulla", () => {
  assert.equal(digestOf([]), null);
});

// ---------------------------------------------------------------------------
// Tetto per argomento: la regola che rende leggibile il digest
// ---------------------------------------------------------------------------

test("un giorno di beta non occupa l'intera rassegna", () => {
  const digest = digestOf([
    post("iOS 27 Beta 6 disponibile", 1),
    post("iOS 27: novità per Mail", 2),
    post("iOS 27 cambia Siri in Spotlight", 3),
    post("iOS 27 introduce un orologio compatto", 4),
    post("Apple Pay arriva in India", 5),
    post("Apple presenta i nuovi Mac mini", 6),
  ])!;
  const ios = digest.items.filter((i) => i.topic?.slug === "ios-27");
  assert.equal(ios.length, 2, "al massimo due voci per argomento");
  assert.ok(digest.items.length > 2, "gli altri argomenti prendono il posto rimasto");
});

test("gli articoli scartati vengono contati", () => {
  const digest = digestOf([
    post("iOS 27 Beta 6", 1),
    post("iOS 27 Beta 5 novità", 2),
    post("iOS 27 e Siri", 3),
    post("iOS 27 e Mail", 4),
    post("Apple Pay in India", 5),
    post("Apple presenta i Mac", 6),
  ])!;
  assert.ok(digest.omittedCount >= 2);
});

test("il numero massimo di voci è rispettato", () => {
  const posts = Array.from({ length: 20 }, (_, i) => post(`Notizia numero ${i}`, i + 1));
  assert.equal(digestOf(posts)!.items.length, 8);
  assert.equal(digestOf(posts, 5)!.items.length, 5);
});

// ---------------------------------------------------------------------------
// Introduzioni: l'excerpt, non un riassunto generato
// ---------------------------------------------------------------------------

test("l'introduzione viene dall'excerpt dell'articolo", () => {
  const digest = digestOf([
    post("Apple rilascia iOS 27", 1, { excerpt: "Apple ha reso disponibile la beta agli sviluppatori." }),
    post("Seconda", 2),
    post("Terza", 3),
  ])!;
  assert.equal(
    digest.items[0].blurb,
    "Apple ha reso disponibile la beta agli sviluppatori.",
  );
});

test("senza excerpt si ricade sul titolo e non si inventa", () => {
  const digest = digestOf([
    post("Apple rilascia iOS 27", 1, { excerpt: "" }),
    post("Seconda", 2),
    post("Terza", 3),
  ])!;
  assert.equal(digest.items[0].blurb, "Apple rilascia iOS 27");
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

test("l'oggetto porta la notizia principale", () => {
  const digest = digestOf([post("Apple rilascia iOS 27 beta 6", 1), post("B", 2), post("C", 3)])!;
  const subject = renderDigestSubject(digest);
  assert.match(subject, /Apple rilascia iOS 27 beta 6/);
  assert.match(subject, /TechJournal del/);
});

test("l'HTML usa URL assoluti e tabelle di presentazione", () => {
  const digest = digestOf([post("Apple rilascia iOS 27", 1), post("B", 2), post("C", 3)])!;
  const html = renderDigestHtml(digest, OPTIONS);
  assert.match(html, /https:\/\/www\.techjournal\.it\/apple\/slug-/);
  assert.ok(!/href="\//.test(html), "nessun percorso relativo: le email non hanno un'origine");
  assert.match(html, /role="presentation"/);
  assert.ok(!html.includes("<style"), "i client di posta ignorano i fogli di stile");
});

test("il link di disiscrizione è sempre presente", () => {
  const digest = digestOf([post("A", 1), post("B", 2), post("C", 3)])!;
  const html = renderDigestHtml(digest, OPTIONS);
  assert.ok(html.includes("https://example.test/unsub?id=1".replace(/&/g, "&amp;")));
  assert.match(html, /Disiscriviti/);
  assert.match(renderDigestText(digest, OPTIONS), /Disiscriviti: https:\/\/example\.test/);
});

test("il markup nei titoli viene neutralizzato", () => {
  const digest = digestOf([
    post('Titolo con <script>alert("x")</script>', 1),
    post("B", 2),
    post("C", 3),
  ])!;
  const html = renderDigestHtml(digest, OPTIONS);
  assert.ok(!html.includes("<script>alert"), "nessun markup iniettato dal contenuto");
  assert.match(html, /&lt;script&gt;/);
});

test("la versione testuale contiene titoli, sommari e URL", () => {
  const digest = digestOf([post("Apple rilascia iOS 27", 1), post("B", 2), post("C", 3)])!;
  const text = renderDigestText(digest, OPTIONS);
  assert.match(text, /Apple rilascia iOS 27/);
  assert.match(text, /Sommario di Apple rilascia iOS 27\./);
  assert.match(text, /https:\/\/www\.techjournal\.it\/apple\//);
  assert.ok(!text.includes("<"), "nessun markup nella versione testuale");
});
