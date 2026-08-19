import assert from "node:assert/strict";
import { test } from "node:test";
import { normalize, rankResults, scoreEntry, searchEntries, tokenize } from "@/lib/search/match";
import type { SearchEntry } from "@/lib/search/types";

function entry(overrides: Partial<SearchEntry> & { title: string }): SearchEntry {
  return {
    kind: "article",
    id: overrides.title,
    href: "/x",
    ...overrides,
  };
}

const IPHONE_12: SearchEntry = entry({
  kind: "device",
  title: "iPhone 12",
  href: "/compatibility/device/iphone-12",
});
const IPHONE_12_PRO: SearchEntry = entry({
  kind: "device",
  title: "iPhone 12 Pro Max",
  href: "/compatibility/device/iphone-12-pro-max",
});
const IOS_27: SearchEntry = entry({
  kind: "topic",
  title: "iOS 27",
  href: "/topic/ios-27",
  keywords: ["iOS 27"],
});
const VISIONOS: SearchEntry = entry({
  kind: "topic",
  title: "visionOS",
  href: "/topic/visionos",
  keywords: ["visionOS", "xrOS"],
});
const ARTICOLO: SearchEntry = entry({
  title: "Apple rilascia iOS 27 beta 6 agli sviluppatori",
  href: "/apple/ios-27-beta-6",
});

// ---------------------------------------------------------------------------
// Normalizzazione e token
// ---------------------------------------------------------------------------

test("la normalizzazione toglie i diacritici", () => {
  assert.equal(normalize("Compatibilità Apple"), "compatibilita apple");
  assert.equal(normalize("iPhone 12 Pro"), "iphone 12 pro");
});

test("i token troppo corti sono scartati, i numeri no", () => {
  assert.deepEqual(tokenize("iphone 12 a ios 5"), ["iphone", "12", "ios", "5"]);
});

test("una query vuota non produce token", () => {
  assert.deepEqual(tokenize("   "), []);
  assert.deepEqual(tokenize("!!! ???"), []);
});

// ---------------------------------------------------------------------------
// L'esempio del progetto: due entità in una query sola
// ---------------------------------------------------------------------------

test("«iphone 12 ios 27» trova sia il dispositivo sia l'argomento", () => {
  const tokens = tokenize("iphone 12 ios 27");
  const results = searchEntries(tokens, [IPHONE_12, IOS_27, VISIONOS]);
  const titles = results.map((r) => r.title).sort();
  assert.deepEqual(titles, ["iOS 27", "iPhone 12"]);
});

test("una voce che intercetta un solo token su quattro non passa", () => {
  // È la regola che evita di trascinare mezzo archivio dentro ogni ricerca.
  const tokens = tokenize("iphone 12 ios 27");
  const generico = entry({ kind: "topic", title: "iPhone", href: "/iphone" });
  assert.equal(scoreEntry(tokens, generico), null);
});

// ---------------------------------------------------------------------------
// Precisione
// ---------------------------------------------------------------------------

test("la corrispondenza esatta precede quella parziale", () => {
  const tokens = tokenize("iphone 12");
  const results = rankResults(searchEntries(tokens, [IPHONE_12_PRO, IPHONE_12]), 10);
  assert.equal(results[0].title, "iPhone 12");
});

test("il prefisso funziona mentre si digita", () => {
  assert.ok(scoreEntry(tokenize("iphon"), IPHONE_12));
  assert.ok(scoreEntry(tokenize("vision"), VISIONOS));
});

test("i numeri combaciano esattamente, non per prefisso", () => {
  // Caso reale: "iphone 12" restituiva «Apple iPhone 17 Pro … 120Hz».
  const iphone17 = entry({
    kind: "product",
    title: "Apple iPhone 17 Pro 256 GB: display ProMotion fino a 120Hz",
    href: "/p",
  });
  assert.equal(scoreEntry(tokenize("iphone 12"), iphone17), null);
  assert.ok(scoreEntry(tokenize("iphone 17"), iphone17));
});

test("non si cerca a metà parola", () => {
  // "one" dentro "iPhone" produrrebbe accostamenti apparentemente casuali.
  assert.equal(scoreEntry(tokenize("one"), IPHONE_12), null);
  assert.equal(scoreEntry(tokenize("hone"), IPHONE_12), null);
});

test("gli alias del registry sono cercabili", () => {
  // Il lavoro della prima fase si riusa così com'è: chi cerca xrOS trova visionOS.
  const result = scoreEntry(tokenize("xros"), VISIONOS);
  assert.ok(result);
  assert.equal(result.title, "visionOS");
});

test("una query senza riscontro non produce risultati", () => {
  assert.deepEqual(searchEntries(tokenize("lavatrice"), [IPHONE_12, IOS_27]), []);
});

test("una query vuota non produce risultati", () => {
  assert.equal(scoreEntry([], IPHONE_12), null);
  assert.deepEqual(searchEntries([], [IPHONE_12]), []);
});

// ---------------------------------------------------------------------------
// Priorità di categoria
// ---------------------------------------------------------------------------

test("a parità di pertinenza la scheda precede l'articolo", () => {
  const tokens = tokenize("ios 27");
  const results = rankResults(searchEntries(tokens, [ARTICOLO, IOS_27]), 10);
  assert.equal(results[0].kind, "topic");
});

test("l'articolo compare comunque quando è pertinente", () => {
  const tokens = tokenize("ios 27");
  const results = searchEntries(tokens, [ARTICOLO, IOS_27]);
  assert.equal(results.length, 2);
});

// ---------------------------------------------------------------------------
// Ordinamento
// ---------------------------------------------------------------------------

test("l'ordinamento è stabile fra due esecuzioni", () => {
  const tokens = tokenize("iphone 12");
  const uno = rankResults(searchEntries(tokens, [IPHONE_12_PRO, IPHONE_12]), 10).map((r) => r.title);
  const due = rankResults(searchEntries(tokens, [IPHONE_12, IPHONE_12_PRO]), 10).map((r) => r.title);
  assert.deepEqual(uno, due);
});

test("il limite viene rispettato", () => {
  const many = Array.from({ length: 20 }, (_, i) =>
    entry({ kind: "device", title: `iPhone 1${i}`, href: `/d/${i}` }),
  );
  assert.equal(rankResults(searchEntries(tokenize("iphone"), many), 5).length, 5);
});

// ---------------------------------------------------------------------------
// Soglia adattiva: query corte precise, query lunghe permissive
// ---------------------------------------------------------------------------

test("una query di due token deve combaciare per intero", () => {
  // Caso reale: "apple pay" restituiva cinque prodotti Apple qualsiasi.
  const tokens = tokenize("apple pay");
  const airpods = entry({ kind: "product", title: "Apple AirPods 4 Auricolari wireless", href: "/p" });
  assert.equal(scoreEntry(tokens, airpods), null);

  const applePay = entry({ kind: "topic", title: "Apple Pay", href: "/topic/apple-pay" });
  assert.ok(scoreEntry(tokens, applePay));
});

test("un numero da solo non basta a rispondere a una query di due token", () => {
  // Caso reale: «LG Monitor 27"» compariva fra i risultati di "ios 27".
  const monitor = entry({ kind: "product", title: 'LG 27U411A Monitor 27" Full HD', href: "/p" });
  assert.equal(scoreEntry(tokenize("ios 27"), monitor), null);
});

test("la versione sbagliata non risponde a una query di due token", () => {
  const ios13 = entry({ kind: "os", title: "iOS 13.7", href: "/compatibility/os/ios-13-7" });
  assert.equal(scoreEntry(tokenize("ios 27"), ios13), null);
  assert.ok(scoreEntry(tokenize("ios 13"), ios13));
});

test("una query lunga ammette la corrispondenza parziale", () => {
  // Senza questa deroga l'esempio del progetto non restituirebbe nulla.
  const tokens = tokenize("iphone 12 ios 27");
  assert.ok(scoreEntry(tokens, IPHONE_12));
  assert.ok(scoreEntry(tokens, IOS_27));
});

test("un token singolo deve combaciare", () => {
  assert.ok(scoreEntry(tokenize("iphone"), IPHONE_12));
  assert.equal(scoreEntry(tokenize("android"), IPHONE_12), null);
});

test("un titolo interamente nominato batte la coincidenza lessicale", () => {
  // L'articolo intercetta tutti e quattro i token, ma il "12" è il numero delle
  // funzioni: la scheda iPhone 12 è ciò che è stato chiesto.
  const tokens = tokenize("iphone 12 ios 27");
  const articolo = entry({
    title: "iOS 27: le 12 nuove funzioni in arrivo su iPhone",
    href: "/a",
  });
  const results = rankResults(searchEntries(tokens, [articolo, IPHONE_12]), 10);
  assert.equal(results[0].title, "iPhone 12");
});

test("una voce agganciata ai soli numeri viene scartata", () => {
  const monitor = entry({ kind: "product", title: 'LG 27U411A Monitor 27" 12 bit', href: "/p" });
  assert.equal(scoreEntry(tokenize("iphone 12 ios 27"), monitor), null);
});

test("una query di soli numeri può combaciare sui numeri", () => {
  const modello = entry({ kind: "device", title: "iPhone 12", href: "/d" });
  assert.ok(scoreEntry(tokenize("12"), modello));
});

test("un titolo corto interamente nominato resta pertinente", () => {
  // "airpods pro": l'argomento AirPods copre un token su due, ma è esattamente
  // ciò che è stato scritto.
  const airpods = entry({ kind: "topic", title: "AirPods", href: "/topic/airpods" });
  assert.ok(scoreEntry(tokenize("airpods pro"), airpods));
});

test("la deroga non riapre la porta ai falsi positivi", () => {
  const generico = entry({ kind: "product", title: "Apple AirPods 4 Auricolari", href: "/p" });
  assert.equal(scoreEntry(tokenize("apple pay"), generico), null);
});

test("la deroga non ammette un'entità nominata di sfuggita", () => {
  // "iPhone" copre il proprio titolo, ma su una query di quattro token lascia
  // tre parole inspiegate: non è ciò che è stato chiesto.
  const generico = entry({ kind: "topic", title: "iPhone", href: "/iphone" });
  assert.equal(scoreEntry(tokenize("iphone 12 ios 27"), generico), null);
  assert.ok(scoreEntry(tokenize("iphone 12"), generico));
});
