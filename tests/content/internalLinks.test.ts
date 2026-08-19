import assert from "node:assert/strict";
import { test } from "node:test";
import { injectInternalLinks } from "@/lib/content/internalLinks";
import { getTopic } from "@/lib/content/topics";
import type { Topic } from "@/lib/content/types";

function topics(...slugs: string[]): Topic[] {
  return slugs.map((slug) => {
    const topic = getTopic(slug);
    assert.ok(topic, `topic inesistente nel test: ${slug}`);
    return topic;
  });
}

test("collega la prima menzione e non le successive", () => {
  const { html, linked } = injectInternalLinks(
    "<p>iOS 27 arriva a settembre. Con iOS 27 cambia Siri.</p>",
    topics("ios-27"),
  );
  assert.equal(
    html,
    '<p><a href="/topic/ios-27" class="tj-entity-link">iOS 27</a> arriva a settembre. Con iOS 27 cambia Siri.</p>',
  );
  assert.deepEqual(linked.map((t) => t.slug), ["ios-27"]);
});

test("non annida un link dentro un link esistente", () => {
  const source = '<p>Vedi <a href="https://altro.test/x">la beta di iOS 27</a> per i dettagli.</p>';
  const { html, linked } = injectInternalLinks(source, topics("ios-27"));
  assert.equal(html, source);
  assert.deepEqual(linked, []);
});

test("non collega dentro gli heading", () => {
  const source = '<h2 id="ios-27">iOS 27</h2><p>Novità in arrivo.</p>';
  const { html } = injectInternalLinks(source, topics("ios-27"));
  assert.equal(html, source);
});

test("non modifica il testo delle citazioni", () => {
  const source = "<blockquote><p>iOS 27 è il nostro miglior rilascio</p></blockquote>";
  const { html, linked } = injectInternalLinks(source, topics("ios-27"));
  assert.equal(html, source, "aggiungere un link in una citazione la altera");
  assert.deepEqual(linked, []);
});

test("non collega dentro pre e code", () => {
  const source = "<pre><code>defaults write iOS 27</code></pre>";
  const { html } = injectInternalLinks(source, topics("ios-27"));
  assert.equal(html, source);
});

test("un solo link per paragrafo", () => {
  const { html, linked } = injectInternalLinks(
    "<p>iOS 27 e Siri insieme.</p><p>Anche Siri cambia.</p>",
    topics("ios-27", "siri"),
  );
  assert.deepEqual(linked.map((t) => t.slug), ["ios-27", "siri"]);
  assert.equal(
    html,
    '<p><a href="/topic/ios-27" class="tj-entity-link">iOS 27</a> e Siri insieme.</p>' +
      '<p>Anche <a href="/topic/siri" class="tj-entity-link">Siri</a> cambia.</p>',
  );
});

test("rispetta il tetto massimo di link", () => {
  const { linked } = injectInternalLinks(
    "<p>iOS 27</p><p>Siri</p><p>iPhone 18</p><p>AirTag</p><p>ChatGPT</p>",
    topics("ios-27", "siri", "iphone-18", "airtag", "chatgpt"),
  );
  assert.equal(linked.length, 3);
});

test("maxLinks a zero lascia l'HTML intatto", () => {
  const source = "<p>iOS 27</p>";
  const { html, linked } = injectInternalLinks(source, topics("ios-27"), { maxLinks: 0 });
  assert.equal(html, source);
  assert.deepEqual(linked, []);
});

test("skipHrefs esclude l'archivio della categoria dell'articolo", () => {
  const source = "<p>Apple ha annunciato la beta.</p>";
  const { html, linked } = injectInternalLinks(source, topics("apple"), {
    skipHrefs: ["/apple"],
  });
  assert.equal(html, source);
  assert.deepEqual(linked, []);
});

test("non aggiunge un secondo link verso una pagina già collegata a mano", () => {
  const source =
    '<p>Come scritto <a href="/topic/ios-27">qui</a>, iOS 27 arriva a settembre.</p>';
  const { html, linked } = injectInternalLinks(source, topics("ios-27"));
  assert.equal(html, source);
  assert.deepEqual(linked, []);
});

test("a parità di posizione vince l'entità più rilevante", () => {
  // `entities` arriva ordinato per rilevanza: `iphone-18` precede `apple`.
  const { linked } = injectInternalLinks(
    "<p>iPhone 18 e Apple insieme nello stesso paragrafo.</p>",
    topics("iphone-18", "apple"),
  );
  assert.deepEqual(linked.map((t) => t.slug), ["iphone-18"]);
});

test("gli hub battono gli archivi anche se l'archivio compare prima", () => {
  // Struttura dell'articolo reale che ha motivato le due passate: "Apple" è la
  // sola entità del primo tratto di testo, gli hub stanno dentro `<strong>`.
  const { linked, html } = injectInternalLinks(
    "<p>Apple ha risolto la causa sui ritardi di <strong>Siri</strong> e di <strong>Apple Intelligence</strong>.</p>",
    topics("apple", "siri", "apple-intelligence"),
  );
  assert.deepEqual(linked.map((t) => t.slug), ["siri"]);
  assert.ok(html.includes('href="/topic/siri"'));
  assert.ok(!html.includes('href="/apple"'), "il budget non va speso su un archivio già nel menu");
});

test("l'archivio riceve il link se non ci sono hub in gara", () => {
  const { linked } = injectInternalLinks(
    "<p>Apple ha annunciato i risultati trimestrali.</p>",
    topics("apple"),
  );
  assert.deepEqual(linked.map((t) => t.slug), ["apple"]);
});

test("la seconda passata non aggiunge un secondo link nello stesso blocco", () => {
  const { linked, html } = injectInternalLinks(
    "<p>Siri e Apple nello stesso paragrafo.</p>",
    topics("siri", "apple"),
  );
  assert.deepEqual(linked.map((t) => t.slug), ["siri"]);
  assert.equal((html.match(/tj-entity-link/g) ?? []).length, 1);
});

test("la seconda passata usa il budget residuo in un altro blocco", () => {
  const { linked } = injectInternalLinks(
    "<p>Siri cambia.</p><p>Apple conferma.</p>",
    topics("siri", "apple"),
  );
  assert.deepEqual(linked.map((t) => t.slug), ["siri", "apple"]);
});

test("i tag void non aprono un contesto vietato", () => {
  // Un `<img>` dentro un `<figure>`: senza gestione dei void tag, il contatore
  // di profondità non tornerebbe mai a zero e nulla sarebbe più collegabile.
  const { linked } = injectInternalLinks(
    '<figure><img src="https://x.test/a.png"></figure><p>iOS 27 arriva.</p>',
    topics("ios-27"),
  );
  assert.deepEqual(linked.map((t) => t.slug), ["ios-27"]);
});

test("HTML senza menzioni resta identico", () => {
  const source = "<p>Nessuna entità nota qui.</p>";
  assert.equal(injectInternalLinks(source, topics("ios-27")).html, source);
});

test("un tag non chiuso non fa perdere contenuto", () => {
  const source = "<p>iOS 27 arriva.<p";
  const { html } = injectInternalLinks(source, topics("ios-27"));
  assert.ok(html.endsWith("<p"), "il residuo malformato viene copiato così com'è");
  assert.ok(html.includes('href="/topic/ios-27"'));
});
