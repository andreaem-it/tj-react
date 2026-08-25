"use client";

import { useEffect, useRef, useState } from "react";

interface ArticleAudioResponse {
  segmentUrls: string[];
  voiceName: string;
}

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export default function ArticleAudioPlayer({ postId }: { postId: number }) {
  const [segments, setSegments] = useState<string[]>([]);
  const [segment, setSegment] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [unavailable, setUnavailable] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/article-audio/${postId}`, { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error("Audio non disponibile");
        return (await response.json()) as ArticleAudioResponse;
      })
      .then((body) => {
        const urls = body?.segmentUrls.filter((url) => typeof url === "string" && url.startsWith("https://")) ?? [];
        if (urls.length === 0) setUnavailable(true);
        else setSegments(urls);
      })
      .catch(() => {
        if (!controller.signal.aborted) setUnavailable(true);
      });
    return () => controller.abort();
  }, [postId]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate, segment]);

  if (unavailable || segments.length === 0) return null;

  async function togglePlay() {
    const player = audioRef.current;
    if (!player) return;
    if (player.paused) await player.play();
    else player.pause();
  }

  function skip(seconds: number) {
    const player = audioRef.current;
    if (!player) return;
    if (seconds < 0 && player.currentTime + seconds < 0 && segment > 0) {
      setSegment((value) => value - 1);
      setPlaying(true);
      return;
    }
    if (seconds > 0 && player.currentTime + seconds >= player.duration && segment < segments.length - 1) {
      setSegment((value) => value + 1);
      setPlaying(true);
      return;
    }
    player.currentTime = Math.min(player.duration || 0, Math.max(0, player.currentTime + seconds));
  }

  function nextSegment() {
    if (segment < segments.length - 1) {
      setSegment((value) => value + 1);
      setPlaying(true);
    } else {
      setPlaying(false);
      setSegment(0);
    }
  }

  function loaded() {
    const player = audioRef.current;
    if (!player) return;
    player.playbackRate = rate;
    setDuration(player.duration || 0);
    setCurrentTime(0);
    if (playing) void player.play();
  }

  return (
    <section className="mt-5 max-w-3xl rounded-xl border border-border bg-surface-overlay/45 p-3 sm:p-4" aria-label="Ascolta questo articolo">
      <audio ref={audioRef} src={segments[segment]} preload="metadata" onLoadedMetadata={loaded} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={nextSegment} />
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => skip(-15)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold text-foreground hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Indietro di 15 secondi">−15</button>
        <button type="button" onClick={togglePlay} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-black hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" aria-label={playing ? "Metti in pausa" : "Ascolta l’articolo"}>
          <span aria-hidden="true" className="text-lg">{playing ? "Ⅱ" : "▶"}</span>
        </button>
        <button type="button" onClick={() => skip(15)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold text-foreground hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Avanti di 15 secondi">+15</button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 text-xs text-muted">
            <strong className="truncate text-foreground">Ascolta l’articolo</strong>
            <span>{clock(currentTime)} / {clock(duration)}</span>
          </div>
          <input type="range" min={0} max={duration || 0} step={0.1} value={Math.min(currentTime, duration || 0)} onChange={(event) => { if (audioRef.current) audioRef.current.currentTime = Number(event.target.value); }} className="mt-2 h-11 w-full cursor-pointer accent-accent" aria-label={`Posizione audio, segmento ${segment + 1} di ${segments.length}`} />
        </div>
        <label className="sr-only" htmlFor={`audio-rate-${postId}`}>Velocità di riproduzione</label>
        <select id={`audio-rate-${postId}`} value={rate} onChange={(event) => setRate(Number(event.target.value))} className="min-h-11 rounded-lg border border-border bg-content-bg px-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Velocità di riproduzione">
          {[0.75, 1, 1.25, 1.5, 2].map((value) => <option key={value} value={value}>{value}×</option>)}
        </select>
      </div>
      {segments.length > 1 ? <p className="mt-1 text-right text-[11px] text-muted">Parte {segment + 1} di {segments.length}</p> : null}
    </section>
  );
}
