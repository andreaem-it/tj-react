"use client";

import { useEffect, useRef, useState } from "react";
import { audioElapsedTime, audioPositionAtTime, audioTotalDuration } from "@/lib/audioTimeline";
import { parseAudioPlaybackState, serializeAudioPlaybackState } from "@/lib/audioPlayback";
import { track } from "@vercel/analytics";

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
  const [durations, setDurations] = useState<number[]>([]);
  const [rate, setRate] = useState(1);
  const [unavailable, setUnavailable] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingSeekRef = useRef(0);
  const resumeAfterLoadRef = useRef(false);
  const startTrackedRef = useRef(false);
  const completionTrackedRef = useRef(false);
  const restoredRef = useRef(false);
  const lastPersistedPositionRef = useRef(0);
  const storageKey = `techjournal:article-audio:${postId}`;

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
        else {
          setSegments(urls);
          setDurations(Array(urls.length).fill(0));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setUnavailable(true);
      });
    return () => controller.abort();
  }, [postId]);

  useEffect(() => {
    if (segments.length === 0) return;
    let cancelled = false;
    const probes = segments.map((url, index) => {
      const probe = new Audio();
      probe.preload = "metadata";
      probe.onloadedmetadata = () => {
        if (cancelled || !Number.isFinite(probe.duration)) return;
        setDurations((current) => {
          const next = current.length === segments.length ? [...current] : Array(segments.length).fill(0);
          next[index] = probe.duration;
          return next;
        });
      };
      probe.src = url;
      return probe;
    });
    return () => {
      cancelled = true;
      probes.forEach((probe) => {
        probe.onloadedmetadata = null;
        probe.removeAttribute("src");
        probe.load();
      });
    };
  }, [segments]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate, segment]);

  useEffect(() => {
    if (restoredRef.current || durations.length === 0 || durations.some((duration) => duration <= 0)) return;
    restoredRef.current = true;
    let stored = null;
    try {
      stored = parseAudioPlaybackState(window.localStorage.getItem(storageKey));
    } catch {
      return;
    }
    if (!stored) return;
    const target = audioPositionAtTime(durations, Math.min(stored.position, audioTotalDuration(durations)));
    queueMicrotask(() => {
      setRate(stored.rate);
      if (target.segment === segment && audioRef.current) {
        audioRef.current.currentTime = target.localTime;
        setCurrentTime(target.localTime);
      } else {
        pendingSeekRef.current = target.localTime;
        setSegment(target.segment);
      }
    });
  }, [durations, segment, storageKey]);

  if (unavailable || segments.length === 0) return null;

  async function togglePlay() {
    const player = audioRef.current;
    if (!player) return;
    if (player.paused) await player.play();
    else player.pause();
  }

  function moveToGlobalTime(seconds: number, resume: boolean) {
    const player = audioRef.current;
    if (!player) return;
    const target = audioPositionAtTime(durations, seconds);
    if (target.segment === segment) {
      player.currentTime = target.localTime;
      if (resume) void player.play();
    } else {
      pendingSeekRef.current = target.localTime;
      resumeAfterLoadRef.current = resume;
      setSegment(target.segment);
    }
  }

  function skip(seconds: number) {
    const player = audioRef.current;
    if (!player) return;
    moveToGlobalTime(audioElapsedTime(durations, segment, player.currentTime) + seconds, !player.paused);
  }

  function nextSegment() {
    if (segment < segments.length - 1) {
      pendingSeekRef.current = 0;
      resumeAfterLoadRef.current = true;
      setSegment((value) => value + 1);
    } else {
      if (!completionTrackedRef.current) {
        completionTrackedRef.current = true;
        track("article_audio_complete", { postId, rate, segments: segments.length });
      }
      setPlaying(false);
      setSegment(0);
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Playback remains functional when browser storage is unavailable.
      }
    }
  }

  function loaded() {
    const player = audioRef.current;
    if (!player) return;
    player.playbackRate = rate;
    setDurations((current) => {
      const next = current.length === segments.length ? [...current] : Array(segments.length).fill(0);
      next[segment] = player.duration || 0;
      return next;
    });
    player.currentTime = pendingSeekRef.current;
    setCurrentTime(pendingSeekRef.current);
    pendingSeekRef.current = 0;
    if (resumeAfterLoadRef.current) {
      resumeAfterLoadRef.current = false;
      void player.play();
    }
  }

  const totalDuration = audioTotalDuration(durations);
  const elapsedTime = audioElapsedTime(durations, segment, currentTime);

  function handlePlay() {
    setPlaying(true);
    if (!startTrackedRef.current) {
      startTrackedRef.current = true;
      track("article_audio_start", { postId, segments: segments.length });
    }
  }

  function changeRate(value: number) {
    setRate(value);
    persistPlayback(elapsedTime, value, true);
    track("article_audio_rate", { postId, rate: value });
  }

  function persistPlayback(position: number, playbackRate: number, force = false) {
    if (!force && Math.abs(position - lastPersistedPositionRef.current) < 5) return;
    try {
      window.localStorage.setItem(storageKey, serializeAudioPlaybackState({ position, rate: playbackRate }));
      lastPersistedPositionRef.current = position;
    } catch {
      // Playback remains functional when browser storage is unavailable.
    }
  }

  function updateCurrentTime(localTime: number) {
    setCurrentTime(localTime);
    const position = audioElapsedTime(durations, segment, localTime);
    persistPlayback(position, rate);
  }

  function handlePause() {
    setPlaying(false);
    const player = audioRef.current;
    if (player) persistPlayback(audioElapsedTime(durations, segment, player.currentTime), rate, true);
  }

  return (
    <section className="mt-5 max-w-3xl rounded-xl border border-border bg-surface-overlay/45 p-3 sm:p-4" aria-label="Ascolta questo articolo">
      <audio ref={audioRef} src={segments[segment]} preload="metadata" onLoadedMetadata={loaded} onTimeUpdate={(event) => updateCurrentTime(event.currentTarget.currentTime)} onPlay={handlePlay} onPause={handlePause} onEnded={nextSegment} />
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => skip(-15)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold text-foreground hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Indietro di 15 secondi">−15</button>
        <button type="button" onClick={togglePlay} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-black hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" aria-label={playing ? "Metti in pausa" : "Ascolta l’articolo"}>
          <span aria-hidden="true" className="text-lg">{playing ? "Ⅱ" : "▶"}</span>
        </button>
        <button type="button" onClick={() => skip(15)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold text-foreground hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Avanti di 15 secondi">+15</button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 text-xs text-muted">
            <strong className="truncate text-foreground">Ascolta l’articolo</strong>
            <span>{clock(elapsedTime)} / {clock(totalDuration)}</span>
          </div>
          <input type="range" min={0} max={totalDuration || 0} step={0.1} value={Math.min(elapsedTime, totalDuration || 0)} disabled={totalDuration === 0} onChange={(event) => moveToGlobalTime(Number(event.target.value), playing)} className="mt-2 h-11 w-full cursor-pointer accent-accent disabled:cursor-wait disabled:opacity-50" aria-label="Posizione nell’audio completo dell’articolo" />
        </div>
        <label className="sr-only" htmlFor={`audio-rate-${postId}`}>Velocità di riproduzione</label>
        <select id={`audio-rate-${postId}`} value={rate} onChange={(event) => changeRate(Number(event.target.value))} className="min-h-11 rounded-lg border border-border bg-content-bg px-2 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Velocità di riproduzione">
          {[0.75, 1, 1.25, 1.5, 2].map((value) => <option key={value} value={value}>{value}×</option>)}
        </select>
      </div>
      {segments.length > 1 ? <p className="mt-1 text-right text-[11px] text-muted">Parte {segment + 1} di {segments.length}</p> : null}
    </section>
  );
}
