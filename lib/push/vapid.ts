/**
 * `PushManager.subscribe` vuole `applicationServerKey` come `Uint8Array` (o
 * `BufferSource`), non come stringa. La chiave pubblica VAPID viaggia invece in
 * base64url — è così che viene generata, distribuita in env e passata al
 * client — quindi serve una conversione, ed è l'unico punto del sito che deve
 * saperla fare.
 *
 * Pura e testabile: nessun accesso a `window`/`crypto`, solo aritmetica su
 * stringhe e byte.
 */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}
