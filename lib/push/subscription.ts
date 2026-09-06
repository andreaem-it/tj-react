/**
 * Sottoscrizione push attiva di questo browser, se esiste (§24, §46).
 *
 * Client-only: legge lo stato del service worker registrato da `PushOptIn`
 * (`/sw.js`). Non registra nulla — se le notifiche non sono mai state
 * attivate restituisce `null`, e chi chiama deve degradare di conseguenza
 * (nessun avviso server-side possibile senza un endpoint a cui mandarlo).
 */
export async function getActivePushSubscriptionEndpoint(): Promise<string | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    const subscription = await registration?.pushManager.getSubscription();
    return subscription?.endpoint ?? null;
  } catch {
    return null;
  }
}
