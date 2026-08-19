import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyContentType,
  classifyPost,
  classifyReliability,
  isEvergreen,
  readingMinutes,
} from "@/lib/content/classify";

// ---------------------------------------------------------------------------
// Tipo di contenuto
// ---------------------------------------------------------------------------

test("il default è news", () => {
  assert.equal(
    classifyContentType({ title: "Apple rilascia watchOS 27 Beta 5 agli sviluppatori", categorySlug: "apple" }),
    "news",
  );
});

test("la categoria guide vale come formato", () => {
  assert.equal(
    classifyContentType({ title: "Come liberare spazio su iPhone", categorySlug: "guide" }),
    "guide",
  );
});

test("la categoria offerte non è un formato editoriale", () => {
  assert.equal(
    classifyContentType({ title: "AirPods Pro in sconto", categorySlug: "offerte" }),
    "deal",
  );
});

test("il confronto batte la categoria guide", () => {
  // Caso reale: questo articolo sta in `guide` ma l'intento di ricerca è un
  // confronto, e la struttura di pagina che merita è diversa.
  assert.equal(
    classifyContentType({
      title: "iPhone 17: conviene comprarlo ora o aspettare iPhone 18?",
      categorySlug: "guide",
    }),
    "comparison",
  );
});

test("riconosce i confronti espliciti", () => {
  assert.equal(classifyContentType({ title: "iPhone 17 Pro vs iPhone 16 Pro" }), "comparison");
  assert.equal(classifyContentType({ title: "Confronto fra i Mac con chip M4" }), "comparison");
});

test("riconosce le recensioni prima di ogni altra regola", () => {
  assert.equal(
    classifyContentType({ title: "Recensione AirPods Pro 3", categorySlug: "apple" }),
    "review",
  );
});

test("riconosce le guide dal titolo anche fuori dalla categoria guide", () => {
  assert.equal(classifyContentType({ title: "Come configurare Apple Pay", categorySlug: "apple" }), "guide");
  assert.equal(classifyContentType({ title: "Guida ai backup di iPhone", categorySlug: "iphone" }), "guide");
});

test("riconosce gli approfondimenti", () => {
  assert.equal(classifyContentType({ title: "Tutte le novità di iOS 27" }), "deep-dive");
  assert.equal(
    classifyContentType({ title: "Cosa aspettarsi a settembre: nuovi iPhone e Apple Watch" }),
    "deep-dive",
  );
});

test("solo i formati non deperibili sono evergreen", () => {
  assert.equal(isEvergreen("guide"), true);
  assert.equal(isEvergreen("comparison"), true);
  assert.equal(isEvergreen("deep-dive"), true);
  assert.equal(isEvergreen("news"), false);
  assert.equal(isEvergreen("deal"), false);
});

// ---------------------------------------------------------------------------
// Affidabilità
// ---------------------------------------------------------------------------

test("un atto compiuto dall'azienda è ufficiale", () => {
  assert.equal(classifyReliability({ title: "Apple rilascia watchOS 27 Beta 5" }), "official");
  assert.equal(classifyReliability({ title: "tvOS 27 e watchOS 27: disponibili le terze beta" }), "official");
  assert.equal(classifyReliability({ title: "Apple dichiara obsoleto l'iPhone X" }), "unspecified");
});

test("il linguaggio dubitativo è rumor", () => {
  assert.equal(
    classifyReliability({ title: "iPhone 18 Pro Max: possibile aumento della capacità batteria" }),
    "rumor",
  );
  assert.equal(
    classifyReliability({ title: "iPhone Ultra: le due fotocamere potrebbero trovarsi nello stesso angolo" }),
    "rumor",
  );
  assert.equal(
    classifyReliability({ title: "iPhone Ultra pieghevole: le immagini suggeriscono finiture silver" }),
    "rumor",
  );
});

test("la speculazione qualifica l'affermazione e batte l'ufficialità", () => {
  // "rilascia" c'è, ma è in una subordinata: l'affermazione del titolo resta ipotetica.
  assert.equal(
    classifyReliability({
      title: "Apple rilascia la beta, ma il chip potrebbe cambiare prima del lancio",
    }),
    "rumor",
  );
});

test("l'attribuzione a una fonte è un report", () => {
  assert.equal(
    classifyReliability({ title: "iPhone 18 Pro, costo componenti +38% secondo un'analisi" }),
    "report",
  );
  assert.equal(classifyReliability({ title: "Bloomberg: nuovo Mac mini in arrivo" }), "report");
});

test("il titolo prevale sull'excerpt", () => {
  assert.equal(
    classifyReliability({
      title: "iPhone 18: possibile nuovo design",
      excerpt: "Apple ha confermato ufficialmente il calendario.",
    }),
    "rumor",
  );
});

test("l'excerpt viene usato solo se il titolo non dice nulla", () => {
  assert.equal(
    classifyReliability({
      title: "iPhone 18 Pro",
      excerpt: "Secondo Bloomberg il modello arriverà in autunno.",
    }),
    "report",
  );
});

test("nessun segnale resta unspecified e non produce badge", () => {
  assert.equal(classifyReliability({ title: "iPhone 18 Pro: base storage a 256GB" }), "unspecified");
});

// ---------------------------------------------------------------------------
// Tempo di lettura
// ---------------------------------------------------------------------------

test("readingMinutes arrotonda con un minimo di un minuto", () => {
  assert.equal(readingMinutes(0), 0);
  assert.equal(readingMinutes(1), 1);
  assert.equal(readingMinutes(100), 1);
  assert.equal(readingMinutes(200), 1);
  assert.equal(readingMinutes(500), 3);
  assert.equal(readingMinutes(1200), 6);
});

// ---------------------------------------------------------------------------
// Classificazione da campi di lista
// ---------------------------------------------------------------------------

test("classifyPost restituisce tipo, affidabilità e argomenti insieme", () => {
  const result = classifyPost({
    title: "iOS 27 Beta 5: nuovi icon per Siri, Safari, Impostazioni e altre app",
    excerpt: "Apple ha rilasciato la quinta beta agli sviluppatori.",
    categorySlug: "apple",
  });
  assert.equal(result.contentType, "news");
  // Il titolo non dichiara nulla, l'excerpt sì ("Apple ha rilasciato"): il
  // ripiego sull'excerpt è quello che rende ufficiale questa notizia.
  assert.equal(result.reliability, "official");
  // `apple` compare perché l'excerpt lo nomina: è corretto come entità. Sta poi
  // alla resa a schermo non mostrare una chip verso l'archivio che
  // l'intestazione dell'articolo linka già.
  assert.deepEqual(
    result.topics.map((t) => t.slug).sort(),
    ["apple", "ios-27", "siri"],
  );
});
