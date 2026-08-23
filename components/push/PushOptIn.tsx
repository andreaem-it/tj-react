"use client";

import { useCallback, useEffect, useState } from "react";
import { urlBase64ToUint8Array } from "@/lib/push/vapid";
import { usePersonal } from "@/lib/personal/usePersonal";
import type { PushSubscribeBody, PushUnsubscribeBody } from "@/lib/push/types";

type Status =
  | "checking"
  | "unsupported"
  | "denied"
  | "off"
  | "on"
  | "subscribing"
  | "unsubscribing"
  | "error";

const SW_PATH = "/sw.js";

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Attiva/disattiva le notifiche push per questo browser (§46).
 *
 * ## Perché il service worker si registra solo qui, mai in background
 *
 * `/personale` dichiara esplicitamente "nessun dato inviato a noi": è vero per
 * argomenti seguiti, articoli salvati e prezzi osservati, tutti in
 * `localStorage`. Le notifiche sono la sola eccezione, e per restare
 * un'eccezione onesta devono essere un'azione esplicita — il service worker
 * non si registra al caricamento della pagina, solo al clic su "Attiva".
 * Senza sottoscrizione attiva, questo componente non manda nulla al server.
 *
 * ## Cosa succede al server
 *
 * Il browser genera endpoint + chiavi (`p256dh`, `auth`) tramite l'API Push
 * standard; questo componente li inoltra a `/api/push/subscribe`, che li
 * proxa a tj-api senza guardarli. Gli argomenti seguiti viaggiano solo se già
 * presenti in `localStorage`, e solo come lista di slug — mai il resto dei
 * dati personali.
 */
export default function PushOptIn() {
  const [status, setStatus] = useState<Status>("checking");
  const { data, hydrated } = usePersonal();

  useEffect(() => {
    if (!isSupported()) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    let cancelled = false;
    navigator.serviceWorker
      .getRegistration(SW_PATH)
      .then((registration) => registration?.pushManager.getSubscription() ?? null)
      .then((subscription) => {
        if (!cancelled) setStatus(subscription ? "on" : "off");
      })
      .catch(() => {
        if (!cancelled) setStatus("off");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const subscribe = useCallback(async () => {
    if (!publicKey) return;
    setStatus("subscribing");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.register(SW_PATH);
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Sottoscrizione incompleta");
      }
      const body: PushSubscribeBody = {
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        topics: hydrated ? data.topics.map((topic) => topic.slug) : undefined,
      };
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`subscribe ${res.status}`);
      setStatus("on");
    } catch {
      setStatus("error");
    }
  }, [publicKey, data.topics, hydrated]);

  const unsubscribe = useCallback(async () => {
    setStatus("unsubscribing");
    try {
      const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
      const subscription = await registration?.pushManager.getSubscription();
      const endpoint = subscription?.endpoint;
      if (subscription) await subscription.unsubscribe();
      if (endpoint) {
        const body: PushUnsubscribeBody = { endpoint };
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).catch(() => {
          // Rimossa lato browser: se tj-api non riceve la revoca resterà una
          // riga orfana che smetterà comunque di ricevere invii (l'endpoint
          // non esiste più), non un errore per il lettore.
        });
      }
      setStatus("off");
    } catch {
      setStatus("error");
    }
  }, []);

  if (!publicKey || status === "unsupported" || status === "checking") return null;

  if (status === "denied") {
    return (
      <p className="text-sm text-muted">
        Hai bloccato le notifiche per questo sito dalle impostazioni del browser. Per riattivarle
        devi sbloccarle da lì.
      </p>
    );
  }

  const isOn = status === "on" || status === "unsubscribing";
  const busy = status === "subscribing" || status === "unsubscribing";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted">
        {isOn
          ? "Notifiche attive su questo browser."
          : "Ricevi un avviso per le notizie importanti, senza aprire il sito."}
      </p>
      <button
        type="button"
        onClick={isOn ? unsubscribe : subscribe}
        disabled={busy}
        className="min-h-11 shrink-0 rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
      >
        {isOn ? "Disattiva notifiche" : "Attiva notifiche"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-500" role="alert">
          Non è stato possibile completare l&apos;operazione. Riprova.
        </p>
      )}
    </div>
  );
}
