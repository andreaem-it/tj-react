/** Header condivisi per le fetch server-to-server verso tj-api. */
export function tjApiServerHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "TechJournal-Frontend/1.0 (+https://www.techjournal.it)",
  };
  const bypass = process.env.TJ_API_BYPASS_TOKEN?.trim();
  if (bypass) headers["X-TJ-API-Token"] = bypass;
  const protection = process.env.TJ_API_PROTECTION_BYPASS_SECRET?.trim();
  if (protection) headers["x-vercel-protection-bypass"] = protection;
  return headers;
}
