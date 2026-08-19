// Service worker minimo, un solo scopo: ricevere notifiche push e aprirle.
// Nessuna cache, nessun intercetto di `fetch`: aggiungerne uno qui vorrebbe
// dire far transitare ogni richiesta del sito da questo file, un rischio che
// non ha nulla a che fare con le notifiche. Registrato solo quando il
// lettore preme "Attiva notifiche" (mai in background) — vedi PushOptIn.tsx.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title : "TechJournal";
  const url = typeof payload.url === "string" && payload.url.trim() ? payload.url : "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof payload.body === "string" ? payload.body : "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url },
      tag: typeof payload.tag === "string" ? payload.tag : undefined,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const absolute = new URL(url, self.location.origin).href;
      for (const client of windows) {
        if (client.url === absolute && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(absolute);
    })
  );
});
