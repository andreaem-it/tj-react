"use client";

export type ClientDiagnosticName =
  | "javascript_error"
  | "content_load_error"
  | "resource_load_error"
  | "unhandled_rejection"
  | "app_render_error";

export type ClientDiagnosticInput = {
  eventName: ClientDiagnosticName;
  severity?: "error" | "warning";
  errorType: string;
  message?: string | null;
  source?: string | null;
  stack?: string | null;
  context?: string | null;
  digest?: string | null;
};

const SESSION_COUNT_KEY = "tj:diagnostic-count";
const MAX_EVENTS_PER_SESSION = 20;

function reserveSessionSlot(): boolean {
  try {
    const count = Number(sessionStorage.getItem(SESSION_COUNT_KEY) ?? 0);
    if (!Number.isFinite(count) || count >= MAX_EVENTS_PER_SESSION) return false;
    sessionStorage.setItem(SESSION_COUNT_KEY, String(count + 1));
    return true;
  } catch {
    // Storage può essere bloccato. In quel caso il server applica comunque i
    // propri limiti e accettiamo l'evento senza far fallire la pagina.
    return true;
  }
}

function safeErrorMessage(value: unknown): string {
  if (value instanceof Error) return value.message || value.name;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function errorDetails(value: unknown): { message: string; stack: string | null; errorType: string } {
  return {
    message: safeErrorMessage(value).slice(0, 1000),
    stack: value instanceof Error && value.stack ? value.stack.slice(0, 4000) : null,
    errorType: value instanceof Error ? value.name || "Error" : typeof value,
  };
}

/** Best-effort: la diagnostica non deve mai produrre un secondo errore. */
export function reportClientDiagnostic(input: ClientDiagnosticInput): void {
  if (typeof window === "undefined" || !reserveSessionSlot()) return;
  const payload = {
    eventId: crypto.randomUUID(),
    eventName: input.eventName,
    severity: input.severity ?? "error",
    errorType: input.errorType.slice(0, 100),
    message: input.message?.slice(0, 1000) ?? null,
    source: input.source?.slice(0, 1024) ?? null,
    stack: input.stack?.slice(0, 4000) ?? null,
    pagePath: window.location.pathname,
    context: input.context?.slice(0, 160) ?? null,
    digest: input.digest?.slice(0, 160) ?? null,
    release: process.env.NEXT_PUBLIC_APP_VERSION?.slice(0, 100) ?? null,
    occurredAt: new Date().toISOString(),
  };

  void fetch("/api/diagnostics/client-errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "omit",
    keepalive: true,
  }).catch(() => undefined);
}
