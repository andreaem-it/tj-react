/** Corpo inviato a `/api/push/subscribe`, proxato a tj-api senza modifiche. */
export interface PushSubscribeBody {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  /**
   * Slug degli argomenti seguiti in questo browser (da `lib/personal/store.ts`),
   * al momento della sottoscrizione. Facoltativo: un lettore può attivare le
   * notifiche senza seguire nulla, e riceverà solo i generali (breaking news).
   * Non è un consenso separato dal browser — la lista viene letta da
   * `localStorage`, mai comunicata altrove.
   */
  topics?: string[];
}

/** Corpo inviato a `/api/push/unsubscribe`. */
export interface PushUnsubscribeBody {
  endpoint: string;
}
