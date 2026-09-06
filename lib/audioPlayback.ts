export interface AudioPlaybackState {
  position: number;
  rate: number;
}

const ALLOWED_RATES = new Set([0.75, 1, 1.25, 1.5, 2]);

export function parseAudioPlaybackState(value: string | null): AudioPlaybackState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<AudioPlaybackState>;
    if (!Number.isFinite(parsed.position) || Number(parsed.position) < 0) return null;
    if (!ALLOWED_RATES.has(Number(parsed.rate))) return null;
    return { position: Number(parsed.position), rate: Number(parsed.rate) };
  } catch {
    return null;
  }
}

export function serializeAudioPlaybackState(state: AudioPlaybackState): string {
  return JSON.stringify({ position: Math.max(0, state.position), rate: state.rate });
}
