type TelegramChannelCtaVariant = "sidebar" | "newsletter" | "article";

interface TelegramChannelCtaProps {
  variant: TelegramChannelCtaVariant;
}

const TELEGRAM_URL = "https://t.me/techjournal_it";

function TelegramIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.9 4.2c.3-1.2-.5-1.7-1.4-1.4L2.7 9.7c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.8 5.5c.2.6.1.9.8.9.5 0 .8-.2 1-.5l2.2-2.1 4.5 3.3c.8.5 1.4.3 1.6-.8l2.9-14.7ZM8.6 12.3l9-5.7c.4-.3.8-.1.5.2l-7.4 6.7-.3 3.4-1.8-4.6Z" />
    </svg>
  );
}

export default function TelegramChannelCta({ variant }: TelegramChannelCtaProps) {
  if (variant === "sidebar") {
    return (
      <a
        href={TELEGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex min-h-11 w-full items-center gap-3 rounded bg-[#229ed9] px-3 py-2.5 text-white transition-colors hover:bg-[#168bc3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Segui TechJournal su Telegram"
      >
        <TelegramIcon className="h-6 w-6 shrink-0" />
        <span className="min-w-0 text-left">
          <span className="block text-sm font-semibold">Seguici su Telegram</span>
          <span className="block text-xs leading-5 text-white/85">
            I nuovi articoli, appena pubblicati
          </span>
        </span>
        <svg
          className="ml-auto h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
        </svg>
      </a>
    );
  }

  if (variant === "newsletter") {
    return (
      <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-5 text-muted">
          <span className="font-semibold text-foreground">Preferisci Telegram?</span>{" "}
          Ricevi i nuovi articoli appena vengono pubblicati.
        </p>
        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#229ed9] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#168bc3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Apri il canale Telegram di TechJournal"
        >
          <TelegramIcon />
          Apri il canale
        </a>
      </div>
    );
  }

  return (
    <section
      className="mt-8 border-t border-border pt-6"
      aria-labelledby="telegram-channel-title"
    >
      <div className="flex flex-col gap-4 rounded-surface bg-sidebar-bg p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#229ed9] text-white">
            <TelegramIcon className="h-6 w-6" />
          </span>
          <div>
            <h2 id="telegram-channel-title" className="font-semibold text-foreground">
              Resta aggiornato con TechJournal
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Segui il nostro canale Telegram e ricevi i nuovi articoli appena vengono pubblicati.
            </p>
          </div>
        </div>
        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-[#229ed9] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#168bc3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-content-bg"
          aria-label="Segui il canale Telegram di TechJournal"
        >
          Segui il canale
        </a>
      </div>
    </section>
  );
}
