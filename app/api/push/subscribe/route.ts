import { NextRequest, NextResponse } from "next/server";
import { proxyToTjApi } from "@/lib/tjApiProxy";

export const dynamic = "force-dynamic";
const MAX_PUSH_PAYLOAD_BYTES = 64 * 1024;

/**
 * Salva una sottoscrizione push. Corpo: vedi `PushSubscribeBody`
 * (`lib/push/types.ts`). Nessun segreto qui: chi chiama è il browser del
 * lettore, non un pannello admin — stesso schema di `/api/newsletter`.
 *
 * tj-api deve esporre lo stesso path (`POST /api/push/subscribe`) e fare
 * upsert per `endpoint`, non insert cieco: un browser che riattiva le
 * notifiche rimanda la stessa sottoscrizione più volte.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    const raw = await request.clone().text();
    if (Buffer.byteLength(raw, "utf8") > MAX_PUSH_PAYLOAD_BYTES) {
      return NextResponse.json({ error: "Payload troppo grande" }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Payload JSON non valido" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Sottoscrizione push non valida" }, { status: 400 });
  }
  const value = body as Partial<{
    endpoint: string;
    keys: { p256dh: string; auth: string };
    topics: unknown[];
  }>;
  let endpoint: URL;
  try {
    endpoint = new URL(value.endpoint ?? "");
  } catch {
    return NextResponse.json({ error: "Endpoint push non valido" }, { status: 400 });
  }
  const keysValid =
    typeof value.keys?.p256dh === "string" &&
    value.keys.p256dh.length >= 16 &&
    value.keys.p256dh.length <= 512 &&
    typeof value.keys.auth === "string" &&
    value.keys.auth.length >= 8 &&
    value.keys.auth.length <= 256;
  const topicsValid =
    value.topics === undefined ||
    (Array.isArray(value.topics) &&
      value.topics.length <= 100 &&
      value.topics.every(
        (topic) => typeof topic === "string" && /^[a-z0-9](?:[a-z0-9-]{0,198}[a-z0-9])?$/.test(topic),
      ));
  const endpointValid =
    endpoint.protocol === "https:" &&
    endpoint.href.length <= 4096 &&
    endpoint.username === "" &&
    endpoint.password === "" &&
    endpoint.hash === "";
  if (!endpointValid || !keysValid || !topicsValid) {
    return NextResponse.json({ error: "Sottoscrizione push non valida" }, { status: 400 });
  }
  return proxyToTjApi(request, { timeoutMs: 15_000 });
}
