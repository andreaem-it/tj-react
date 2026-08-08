const SITE_NAME = "TechJournal";
const TITLE_SEPARATOR = " | ";
const MAX_TITLE_LENGTH = 60;

function truncateAtWord(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const truncated = normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd();
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace >= Math.floor(maxLength * 0.6)) {
    return `${truncated.slice(0, lastSpace)}...`;
  }
  return `${truncated}...`;
}

export function brandedSeoTitle(title: string): string {
  const base = title.replace(/\s*\|\s*TechJournal\s*$/i, "").trim();
  const brandSuffix = `${TITLE_SEPARATOR}${SITE_NAME}`;
  return `${truncateAtWord(base, MAX_TITLE_LENGTH - brandSuffix.length)}${brandSuffix}`;
}

export function seoDescription(description: string, fallback: string): string {
  const value = (description || fallback).replace(/\s+/g, " ").trim();
  return truncateAtWord(value, 160);
}
