import { test } from "node:test";
import assert from "node:assert/strict";
import { urlBase64ToUint8Array } from "@/lib/push/vapid";

test("decodifica una chiave pubblica VAPID reale (65 byte, prefisso 0x04)", () => {
  const publicKey =
    "BG9Xls07n1rH4aE1bqAgeVbeuqa7c5LVaT_HAW5DzJOS9lmtJzFtsyTHkEb-_Fl9yjfcgTPSNaDSyPO3C56lk-c";
  const bytes = urlBase64ToUint8Array(publicKey);
  assert.equal(bytes.length, 65);
  assert.equal(bytes[0], 0x04);
});

test("round-trip con Buffer.from(base64url) per stringhe arbitrarie", () => {
  const original = "hello vapid world, con simboli - e _";
  const base64Url = Buffer.from(original, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const decoded = Buffer.from(urlBase64ToUint8Array(base64Url)).toString("utf8");
  assert.equal(decoded, original);
});

test("gestisce lunghezze che richiedono padding diverso (0, 1, 2, 3 caratteri di resto)", () => {
  for (const len of [4, 5, 6, 7, 8]) {
    const original = "x".repeat(len);
    const base64Url = Buffer.from(original, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const decoded = Buffer.from(urlBase64ToUint8Array(base64Url)).toString("utf8");
    assert.equal(decoded, original, `lunghezza ${len}`);
  }
});
