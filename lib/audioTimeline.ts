export interface AudioPosition {
  segment: number;
  localTime: number;
}

export function audioTotalDuration(durations: readonly number[]): number {
  return durations.reduce((total, duration) => total + validDuration(duration), 0);
}

export function audioElapsedTime(
  durations: readonly number[],
  segment: number,
  localTime: number,
): number {
  const safeSegment = Math.min(Math.max(0, segment), Math.max(0, durations.length - 1));
  const before = durations.slice(0, safeSegment).reduce((total, duration) => total + validDuration(duration), 0);
  return before + Math.min(Math.max(0, localTime), validDuration(durations[safeSegment]));
}

export function audioPositionAtTime(durations: readonly number[], seconds: number): AudioPosition {
  if (durations.length === 0) return { segment: 0, localTime: 0 };
  const total = audioTotalDuration(durations);
  let remaining = Math.min(Math.max(0, Number.isFinite(seconds) ? seconds : 0), total);
  for (let segment = 0; segment < durations.length; segment += 1) {
    const duration = validDuration(durations[segment]);
    if (remaining < duration || segment === durations.length - 1) {
      return { segment, localTime: Math.min(remaining, duration) };
    }
    remaining -= duration;
  }
  return { segment: durations.length - 1, localTime: validDuration(durations.at(-1) ?? 0) };
}

function validDuration(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}
