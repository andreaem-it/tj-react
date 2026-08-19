import assert from "node:assert/strict";
import { test } from "node:test";
import { buildToc, shouldRenderToc } from "@/lib/content/toc";

test("estrae h2 e h3 con il livello corretto", () => {
  const { entries } = buildToc("<h2>Prima</h2><p>x</p><h3>Dettaglio</h3><h2>Seconda</h2>");
  assert.deepEqual(entries, [
    { id: "prima", text: "Prima", level: 2 },
    { id: "dettaglio", text: "Dettaglio", level: 3 },
    { id: "seconda", text: "Seconda", level: 2 },
  ]);
});

test("ignora h1 e h4", () => {
  const { entries } = buildToc("<h1>Titolo</h1><h4>Nota</h4>");
  assert.deepEqual(entries, []);
});

test("inietta l'id mancante nell'HTML", () => {
  const { html } = buildToc('<h2 class="wp-block-heading">Le novità</h2>');
  assert.equal(html, '<h2 class="wp-block-heading" id="le-novita">Le novità</h2>');
});

test("non riscrive un id già presente", () => {
  const source = '<h2 id="ancora-storica">Le novità</h2>';
  const { html, entries } = buildToc(source);
  assert.equal(html, source, "un id esistente può essere il bersaglio di link altrui");
  assert.equal(entries[0].id, "ancora-storica");
});

test("gli id restano unici anche con heading omonimi", () => {
  const { entries } = buildToc("<h2>Prezzi</h2><h2>Prezzi</h2><h2>Prezzi</h2>");
  assert.deepEqual(entries.map((e) => e.id), ["prezzi", "prezzi-2", "prezzi-3"]);
});

test("un id generato non collide con uno preesistente", () => {
  const { entries } = buildToc('<h2 id="prezzi">Uno</h2><h2>Prezzi</h2>');
  assert.deepEqual(entries.map((e) => e.id), ["prezzi", "prezzi-2"]);
});

test("estrae il testo anche dagli heading con markup interno", () => {
  const { entries } = buildToc("<h2><strong>iOS 27</strong> in breve</h2>");
  assert.equal(entries[0].text, "iOS 27 in breve");
  assert.equal(entries[0].id, "ios-27-in-breve");
});

test("un heading senza testo non entra nell'indice e non riceve ancora", () => {
  const source = '<h2><img src="https://x.test/a.png"></h2>';
  const { html, entries } = buildToc(source);
  assert.deepEqual(entries, []);
  assert.equal(html, source);
});

test("un heading di sola punteggiatura riceve un id di ripiego", () => {
  const { entries } = buildToc("<h2>***</h2>");
  assert.deepEqual(entries, [{ id: "sezione-1", text: "***", level: 2 }]);
});

test("l'indice si mostra solo da tre voci", () => {
  assert.equal(shouldRenderToc([]), false);
  assert.equal(shouldRenderToc([{ id: "a", text: "A", level: 2 }]), false);
  assert.equal(
    shouldRenderToc([
      { id: "a", text: "A", level: 2 },
      { id: "b", text: "B", level: 2 },
    ]),
    false,
  );
  assert.equal(
    shouldRenderToc([
      { id: "a", text: "A", level: 2 },
      { id: "b", text: "B", level: 2 },
      { id: "c", text: "C", level: 2 },
    ]),
    true,
  );
});

test("HTML vuoto non produce nulla", () => {
  assert.deepEqual(buildToc(""), { entries: [], html: "" });
});
