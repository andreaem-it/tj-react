"use client";

interface ShareButtonsProps {
  title: string;
  url: string;
  variant?: "light" | "dark" | "articleTop";
}

export default function ShareButtons({ title, url, variant = "dark" }: ShareButtonsProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  if (variant === "articleTop") {
    const bigBtnClass =
      "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-black text-white hover:opacity-90 transition-opacity font-medium text-sm";
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className={bigBtnClass}
            aria-label="Condividi su Facebook"
          >
            <span className="text-base font-bold">f</span>
            <span>Facebook</span>
          </a>
          <a
            href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
            target="_blank"
            rel="noopener noreferrer"
            className={bigBtnClass}
            aria-label="Condividi su X"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  const btnClass =
    variant === "dark"
      ? "inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10 text-white hover:bg-accent transition-colors"
      : "inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className={btnClass}
        aria-label="Condividi su Facebook"
      >
        <span className="text-sm font-bold">f</span>
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className={btnClass}
        aria-label="Condividi su X"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
      <a
        href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}
        className={btnClass}
        aria-label="Invia per email"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </a>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(url)}
        className={btnClass}
        aria-label="Copia link"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </button>
    </div>
  );
}
