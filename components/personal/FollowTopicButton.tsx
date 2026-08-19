"use client";

import { usePersonal } from "@/lib/personal/usePersonal";
import { followTopic, isFollowingTopic, unfollowTopic } from "@/lib/personal/store";

/**
 * "Segui questo argomento" (§46).
 *
 * Lo stato vive nel browser: nessun account, nessun dato che lascia il
 * dispositivo. Il limite è dichiarato nel `title` del pulsante quando l'argomento
 * viene seguito — è il momento in cui l'utente si sta fidando, e quindi quello in
 * cui va detto che le preferenze non seguono su altri dispositivi.
 */
export default function FollowTopicButton({
  slug,
  name,
  className,
}: {
  slug: string;
  name: string;
  className?: string;
}) {
  const { data, hydrated, update } = usePersonal();
  const following = hydrated && isFollowingTopic(data, slug);

  return (
    <button
      type="button"
      // Prima dell'idratazione lo stato reale non è noto: si disabilita invece di
      // mostrare "Segui" per poi correggerlo in "Segui già" un istante dopo.
      disabled={!hydrated}
      aria-pressed={following}
      onClick={() =>
        update((current) =>
          isFollowingTopic(current, slug)
            ? unfollowTopic(current, slug)
            : followTopic(current, slug, Date.now()),
        )
      }
      title={
        following
          ? "Salvato in questo browser: le preferenze non seguono su altri dispositivi"
          : `Aggiungi ${name} agli argomenti che segui`
      }
      className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
        following
          ? "border-accent bg-accent/15 text-foreground"
          : "border-border text-foreground hover:bg-surface-overlay"
      } ${className ?? ""}`}
    >
      <span aria-hidden>{following ? "★" : "☆"}</span>
      {following ? "Segui già" : "Segui argomento"}
    </button>
  );
}
