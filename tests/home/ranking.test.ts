import assert from "node:assert/strict";
import { test } from "node:test";
import type { PostListItem } from "@/lib/api";
import {
  computeTopicHeat,
  hasUsableTrafficSignal,
  hottestTopicSlug,
  prepareItems,
  rankHomeItems,
  MIN_VIEWS_FOR_TRAFFIC_SIGNAL,
} from "@/lib/home/ranking";

const NOW = Date.UTC(2026, 7, 17, 12, 0, 0);
const HOUR = 3_600_000;

function post(overrides: Partial<PostListItem> & { slug: string }): PostListItem {
  return {
    id: Math.abs(hash(overrides.slug)),
    date: new Date(NOW - HOUR).toISOString(),
    title: "Titolo",
    excerpt: "",
    categoryName: "Apple",
    categorySlug: "apple",
    categoryId: 2,
    imageUrl: null,
    imageAlt: "",
    authorName: "Redazione",
    authorAvatarUrl: null,
    viewCount: 0,
    ...overrides,
  };
}

function hash(value: string): number {
  let h = 0;
  for (const ch of value) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
}

function ago(hours: number): string {
  return new Date(NOW - hours * HOUR).toISOString();
}

function order(posts: PostListItem[], overrides?: Parameters<typeof rankHomeItems>[1]["overrides"]) {
  return rankHomeItems(prepareItems(posts), { now: NOW, overrides }).map((r) => r.post.slug);
}

// ---------------------------------------------------------------------------
// Freschezza
// ---------------------------------------------------------------------------

test("a parità di tutto il resto vince il più recente", () => {
  const ranked = order([
    post({ slug: "vecchio", title: "Apple aggiorna una app", date: ago(72) }),
    post({ slug: "nuovo", title: "Apple aggiorna una app", date: ago(1) }),
    post({ slug: "medio", title: "Apple aggiorna una app", date: ago(24) }),
  ]);
  assert.deepEqual(ranked, ["nuovo", "medio", "vecchio"]);
});

test("una data futura non produce una freschezza fuori scala", () => {
  const ranked = rankHomeItems(
    prepareItems([
      post({ slug: "futuro", date: new Date(NOW + 10 * HOUR).toISOString() }),
      post({ slug: "adesso", date: ago(0) }),
    ]),
    { now: NOW },
  );
  for (const item of ranked) {
    assert.ok(item.signals.recency <= 1, `recency ${item.signals.recency} fuori scala`);
  }
});

test("una data malformata non rompe l'ordinamento", () => {
  const ranked = order([
    post({ slug: "rotto", date: "non-una-data" }),
    post({ slug: "buono", date: ago(2) }),
  ]);
  assert.equal(ranked[0], "buono");
  assert.equal(ranked.length, 2);
});

// ---------------------------------------------------------------------------
// Importanza editoriale
// ---------------------------------------------------------------------------

test("una notizia confermata batte un'indiscrezione di pari età", () => {
  const ranked = order([
    post({ slug: "rumor", title: "iPhone 18 Pro: possibile nuova batteria", date: ago(2) }),
    post({ slug: "ufficiale", title: "Apple rilascia watchOS 27 Beta 5", date: ago(2) }),
  ]);
  assert.deepEqual(ranked, ["ufficiale", "rumor"]);
});

test("una guida non scavalca l'attualità in apertura di home", () => {
  const ranked = order([
    post({ slug: "guida", title: "Come configurare Apple Pay", categorySlug: "guide", date: ago(2) }),
    post({ slug: "notizia", title: "Apple rilascia iOS 27 beta 6", date: ago(2) }),
  ]);
  assert.deepEqual(ranked, ["notizia", "guida"]);
});

test("una notizia vecchia non batte una guida molto più recente", () => {
  // La freschezza domina: l'importanza editoriale riordina, non ribalta.
  const ranked = order([
    post({ slug: "notizia-vecchia", title: "Apple rilascia iOS 27 beta 1", date: ago(96) }),
    post({ slug: "guida-nuova", title: "Come configurare Apple Pay", categorySlug: "guide", date: ago(1) }),
  ]);
  assert.deepEqual(ranked, ["guida-nuova", "notizia-vecchia"]);
});

// ---------------------------------------------------------------------------
// Calore degli argomenti
// ---------------------------------------------------------------------------

test("il calore premia l'argomento di cui si sta parlando", () => {
  const posts = [
    post({ slug: "ios27-a", title: "iOS 27 beta 6 disponibile", date: ago(3) }),
    post({ slug: "ios27-b", title: "iOS 27: novità per Mail", date: ago(4) }),
    post({ slug: "ios27-c", title: "iOS 27 cambia Siri", date: ago(5) }),
    post({ slug: "isolato", title: "Sony annuncia nuove cuffie", date: ago(3) }),
  ];
  const heat = computeTopicHeat(prepareItems(posts), NOW);
  assert.equal(heat.get("ios-27"), 1, "l'argomento più trattato è il riferimento");
  assert.ok((heat.get("sony") ?? 0) < 1);
});

test("il calore decade con il tempo", () => {
  const recente = computeTopicHeat(
    prepareItems([
      post({ slug: "a", title: "iOS 27 beta", date: ago(1) }),
      post({ slug: "b", title: "Sony cuffie", date: ago(1) }),
    ]),
    NOW,
  );
  const vecchio = computeTopicHeat(
    prepareItems([
      post({ slug: "a", title: "iOS 27 beta", date: ago(240) }),
      post({ slug: "b", title: "Sony cuffie", date: ago(1) }),
    ]),
    NOW,
  );
  assert.ok((recente.get("ios-27") ?? 0) > (vecchio.get("ios-27") ?? 0));
});

test("un insieme vuoto non produce calore", () => {
  assert.equal(computeTopicHeat([], NOW).size, 0);
});

test("l'argomento del momento richiede una storia, non un articolo solo", () => {
  const posts = [
    post({ slug: "a", title: "iOS 27 beta 6", date: ago(2) }),
    post({ slug: "b", title: "iOS 27: novità Mail", date: ago(3) }),
    post({ slug: "c", title: "iOS 27 e Siri", date: ago(4) }),
    post({ slug: "d", title: "Sony annuncia cuffie", date: ago(1) }),
  ];
  const items = prepareItems(posts);
  assert.equal(hottestTopicSlug(items, NOW), "ios-27");
  // Sony ha un solo articolo, pur essendo il più recente.
  assert.equal(hottestTopicSlug(items, NOW, { minArticles: 4 }), null);
});

// ---------------------------------------------------------------------------
// Traffico: il segnale assente
// ---------------------------------------------------------------------------

test("con poche letture il traffico non entra nel punteggio", () => {
  // Distribuzione reale di produzione: quasi tutto a zero, qualcuno a 1.
  const items = prepareItems([
    post({ slug: "a", viewCount: 1, date: ago(2) }),
    post({ slug: "b", viewCount: 0, date: ago(3) }),
  ]);
  const ranked = rankHomeItems(items, { now: NOW });
  for (const item of ranked) {
    assert.equal(item.signals.traffic, 0, "il traffico deve restare inerte");
  }
});

test("poche letture non ribaltano la cronologia", () => {
  const ranked = order([
    post({ slug: "vecchio-con-2-letture", viewCount: 2, date: ago(60) }),
    post({ slug: "nuovo-senza-letture", viewCount: 0, date: ago(1) }),
  ]);
  assert.deepEqual(ranked, ["nuovo-senza-letture", "vecchio-con-2-letture"]);
});

test("il segnale di traffico si accende oltre la soglia", () => {
  const sotto = [post({ slug: "a", viewCount: MIN_VIEWS_FOR_TRAFFIC_SIGNAL - 1 })];
  const sopra = [post({ slug: "a", viewCount: MIN_VIEWS_FOR_TRAFFIC_SIGNAL })];
  assert.equal(hasUsableTrafficSignal(sotto, { now: NOW }), false);
  assert.equal(hasUsableTrafficSignal(sopra, { now: NOW }), true);
});

test("un totale storico congelato non vale come segnale di traffico", () => {
  // Caso reale: `viewCount` di WordPress si è fermato con la migrazione del
  // contatore, e su `/stadia` un articolo del 2020 con 4.798 letture accendeva
  // una classifica "Più letti" ferma da cinque anni.
  const vecchio = [post({ slug: "stadia-2020", viewCount: 4798, date: ago(24 * 365 * 6) })];
  assert.equal(hasUsableTrafficSignal(vecchio, { now: NOW }), false);
});

test("un archivio di soli articoli vecchi non produce classifiche", () => {
  const archivio = [
    post({ slug: "a", viewCount: 5128, date: ago(24 * 365 * 5) }),
    post({ slug: "b", viewCount: 4878, date: ago(24 * 365 * 5) }),
    post({ slug: "c", viewCount: 0, date: ago(2) }),
  ];
  assert.equal(hasUsableTrafficSignal(archivio, { now: NOW }), false);
});

test("letture recenti sopra soglia accendono il segnale", () => {
  const vivo = [
    post({ slug: "vecchio", viewCount: 5000, date: ago(24 * 365 * 5) }),
    post({ slug: "recente", viewCount: 120, date: ago(12) }),
  ];
  assert.equal(hasUsableTrafficSignal(vivo, { now: NOW }), true);
});

test("una data malformata non può accendere il segnale", () => {
  const rotto = [post({ slug: "rotto", viewCount: 9999, date: "non-una-data" })];
  assert.equal(hasUsableTrafficSignal(rotto, { now: NOW }), false);
});

test("con dati veri conta la velocità, non il totale", () => {
  // Il vecchio ha più letture in assoluto, il nuovo le ha accumulate molto più
  // in fretta: è quest'ultimo la storia del momento.
  const ranked = order([
    post({ slug: "vecchio-tante-letture", viewCount: 1000, date: ago(240) }),
    post({ slug: "nuovo-veloce", viewCount: 400, date: ago(4) }),
  ]);
  assert.deepEqual(ranked, ["nuovo-veloce", "vecchio-tante-letture"]);
});

// ---------------------------------------------------------------------------
// Override manuali
// ---------------------------------------------------------------------------

test("un articolo fissato apre la home", () => {
  const ranked = order(
    [
      post({ slug: "nuovo", title: "Apple rilascia iOS 27", date: ago(1) }),
      post({ slug: "scelto", title: "Vecchio approfondimento", date: ago(200) }),
    ],
    { pinned: ["scelto"] },
  );
  assert.deepEqual(ranked, ["scelto", "nuovo"]);
});

test("più articoli fissati rispettano l'ordine dichiarato", () => {
  const ranked = order(
    [
      post({ slug: "a", date: ago(1) }),
      post({ slug: "b", date: ago(2) }),
      post({ slug: "c", date: ago(3) }),
    ],
    { pinned: ["c", "b"] },
  );
  assert.deepEqual(ranked, ["c", "b", "a"]);
});

test("uno slug fissato inesistente non rompe nulla", () => {
  const ranked = order([post({ slug: "a", date: ago(1) })], { pinned: ["non-esiste"] });
  assert.deepEqual(ranked, ["a"]);
});

test("il boost corregge il punteggio senza forzare la prima posizione", () => {
  const senza = order([
    post({ slug: "x", title: "Apple aggiorna", date: ago(30) }),
    post({ slug: "y", title: "Apple aggiorna", date: ago(1) }),
  ]);
  assert.deepEqual(senza, ["y", "x"]);

  const con = order(
    [
      post({ slug: "x", title: "Apple aggiorna", date: ago(30) }),
      post({ slug: "y", title: "Apple aggiorna", date: ago(1) }),
    ],
    { boost: { x: 2 } },
  );
  assert.deepEqual(con, ["x", "y"]);
});

// ---------------------------------------------------------------------------
// Stabilità
// ---------------------------------------------------------------------------

test("l'ordinamento è stabile fra due esecuzioni identiche", () => {
  const posts = [
    post({ slug: "a", title: "Apple aggiorna", date: ago(5) }),
    post({ slug: "b", title: "Apple aggiorna", date: ago(5) }),
    post({ slug: "c", title: "Apple aggiorna", date: ago(5) }),
  ];
  assert.deepEqual(order(posts), order(posts));
});

test("un insieme vuoto produce una classifica vuota", () => {
  assert.deepEqual(rankHomeItems([], { now: NOW }), []);
});
