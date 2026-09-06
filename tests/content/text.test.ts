import assert from "node:assert/strict";
import { test } from "node:test";
import {
  countWords,
  decodeHtmlEntities,
  escapeRegExp,
  htmlToText,
  slugify,
} from "@/lib/content/text";

test("decodeHtmlEntities gestisce nominate, decimali ed esadecimali", () => {
  assert.equal(decodeHtmlEntities("Apple &amp; Google"), "Apple & Google");
  assert.equal(decodeHtmlEntities("perch&eacute;"), "perché");
  assert.equal(decodeHtmlEntities("&#8217;"), "’");
  assert.equal(decodeHtmlEntities("&#x2019;"), "’");
});

test("decodeHtmlEntities lascia intatto ciò che non riconosce", () => {
  assert.equal(decodeHtmlEntities("&nonesiste;"), "&nonesiste;");
  // Codepoint fuori range: non deve far lanciare fromCodePoint.
  assert.equal(decodeHtmlEntities("&#1114112;"), "&#1114112;");
});

test("htmlToText separa i blocchi invece di incollarli", () => {
  assert.equal(htmlToText("<p>uno</p><p>due</p>"), "uno due");
  assert.equal(htmlToText("<ul><li>a</li><li>b</li></ul>"), "a b");
});

test("htmlToText scarta script, style e didascalie con il loro contenuto", () => {
  assert.equal(htmlToText("<p>testo</p><script>var x = 1;</script>"), "testo");
  assert.equal(
    htmlToText("<figure><img src='x'><figcaption>Foto Apple</figcaption></figure><p>corpo</p>"),
    "corpo",
  );
});

test("countWords conta i token con lettere o cifre", () => {
  assert.equal(countWords("iPhone 18 Pro"), 3);
  assert.equal(countWords("USB-C e Wi-Fi"), 3);
  assert.equal(countWords("   "), 0);
  // La punteggiatura isolata non è una parola.
  assert.equal(countWords("uno — due"), 2);
});

test("countWords tratta lo spazio non separabile come separatore", () => {
  assert.equal(countWords("iOS\u00a027\u00a0beta"), 3);
});

test("slugify rimuove i diacritici italiani", () => {
  assert.equal(slugify("Compatibilità Apple"), "compatibilita-apple");
  assert.equal(slugify("Perché conviene?"), "perche-conviene");
  assert.equal(slugify("iOS 27 — le novità"), "ios-27-le-novita");
});

test("slugify non lascia mai trattini pendenti", () => {
  assert.equal(slugify("  ...Apple!  "), "apple");
  assert.equal(slugify("###"), "");
});

test("escapeRegExp neutralizza i metacaratteri", () => {
  const re = new RegExp(escapeRegExp("iOS 26.6.1"));
  assert.ok(re.test("iOS 26.6.1"));
  assert.ok(!re.test("iOS 26x6y1"));
});
