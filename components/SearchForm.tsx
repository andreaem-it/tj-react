"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

export default function SearchForm({ defaultQuery = "" }: { defaultQuery?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const q = searchParams.get("q") ?? defaultQuery;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputRef.current?.value?.trim();
    if (value) {
      router.push(`/search?q=${encodeURIComponent(value)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Cerca articoli..."
          className="flex-1 rounded-lg border border-border bg-surface-overlay px-4 py-3 text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          aria-label="Cerca articoli"
          autoFocus={!q}
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-accent px-5 py-3 font-medium text-white hover:opacity-90 transition-opacity"
        >
          Cerca
        </button>
      </div>
    </form>
  );
}
