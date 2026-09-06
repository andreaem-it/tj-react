export const READING_CHECKPOINTS = [25, 50, 75, 90] as const;

export function readingDepthPercent(params: {
  elementTop: number;
  elementHeight: number;
  viewportBottom: number;
}): number {
  if (params.elementHeight <= 0) return 0;
  const covered = params.viewportBottom - params.elementTop;
  return Math.max(0, Math.min(100, Math.round((covered / params.elementHeight) * 100)));
}

export function reachedReadingCheckpoint(depth: number, previous: number): number | null {
  let reached: number | null = null;
  for (const checkpoint of READING_CHECKPOINTS) {
    if (depth >= checkpoint && checkpoint > previous) reached = checkpoint;
  }
  return reached;
}
