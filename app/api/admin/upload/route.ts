import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import sharp from "sharp";
import { r2Put, publicUrl, isR2Configured, R2_PUBLIC_URL } from "@/lib/r2";
import * as mediaDb from "@/lib/db/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const THUMB_SIZE = 150;   // 150x150 quadrato (cover)
const SMALL_MAX = 300;    // max lato
const MEDIUM_MAX = 768;
const LARGE_MAX = 1024;

function getExtension(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
  };
  return map[mime] || ".jpg";
}

/** Nome file sicuro (stile WordPress: senza spazi, lowercase) */
function sanitizeBasename(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "image";
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "Storage R2 non configurato (variabili ambiente)" },
      { status: 503 }
    );
  }
  if (!R2_PUBLIC_URL) {
    return NextResponse.json(
      { error: "R2_PUBLIC_URL non impostato: necessario per gli URL pubblici dei file" },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Nessun file" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `File troppo grande (max ${MAX_SIZE / 1024 / 1024} MB)` },
      { status: 400 }
    );
  }

  const mime = file.type;
  if (!ALLOWED_TYPES.includes(mime)) {
    return NextResponse.json(
      { error: "Tipo non consentito (solo JPEG, PNG, GIF, WebP)" },
      { status: 400 }
    );
  }

  const ext = getExtension(mime);
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const baseName = sanitizeBasename(file.name) || "image";
  const uniqueName = `${baseName}-${Date.now().toString(36)}${ext}`;
  const pathPrefix = `${year}/${month}`;
  const fullPath = `${pathPrefix}/${uniqueName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const image = sharp(buffer);
    const meta = await image.metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;

    const contentType = mime;
    const uploads: { key: string; body: Buffer; contentType: string }[] = [];

    // Full (originale)
    uploads.push({ key: fullPath, body: buffer, contentType });

    // Thumb: 150x150 quadrato (cover)
    const thumbBuf = await image
      .clone()
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover" })
      .toFormat(mime === "image/png" ? "png" : "jpeg", { quality: 85 })
      .toBuffer();
    const thumbPath = fullPath.replace(/(\.[^.]+)$/, `-${THUMB_SIZE}x${THUMB_SIZE}$1`);
    uploads.push({ key: thumbPath, body: thumbBuf, contentType: mime });

    // Small: max 300
    const smallImg = image.clone().resize(SMALL_MAX, SMALL_MAX, { fit: "inside" });
    const smallMeta = await smallImg.metadata();
    const smallW = smallMeta.width ?? 0;
    const smallH = smallMeta.height ?? 0;
    const smallBuf = await smallImg
      .toFormat(mime === "image/png" ? "png" : "jpeg", { quality: 85 })
      .toBuffer();
    const smallPath = fullPath.replace(/(\.[^.]+)$/, `-${smallW}x${smallH}$1`);
    uploads.push({ key: smallPath, body: smallBuf, contentType: mime });

    // Medium: max 768
    const mediumImg = image.clone().resize(MEDIUM_MAX, MEDIUM_MAX, { fit: "inside" });
    const mediumMeta = await mediumImg.metadata();
    const mediumW = mediumMeta.width ?? 0;
    const mediumH = mediumMeta.height ?? 0;
    const mediumBuf = await mediumImg
      .toFormat(mime === "image/png" ? "png" : "jpeg", { quality: 85 })
      .toBuffer();
    const mediumPath = fullPath.replace(/(\.[^.]+)$/, `-${mediumW}x${mediumH}$1`);
    uploads.push({ key: mediumPath, body: mediumBuf, contentType: mime });

    // Large: max 1024
    const largeImg = image.clone().resize(LARGE_MAX, LARGE_MAX, { fit: "inside" });
    const largeMeta = await largeImg.metadata();
    const largeW = largeMeta.width ?? 0;
    const largeH = largeMeta.height ?? 0;
    const largeBuf = await largeImg
      .toFormat(mime === "image/png" ? "png" : "jpeg", { quality: 85 })
      .toBuffer();
    const largePath = fullPath.replace(/(\.[^.]+)$/, `-${largeW}x${largeH}$1`);
    uploads.push({ key: largePath, body: largeBuf, contentType: mime });

    for (const u of uploads) {
      await r2Put(u.key, u.body, u.contentType);
    }

    const urlFull = publicUrl(fullPath);
    const urlThumb = publicUrl(thumbPath);
    const urlSmall = publicUrl(smallPath);
    const urlMedium = publicUrl(mediumPath);
    const urlLarge = publicUrl(largePath);

    const media = await mediaDb.createMedia({
      path: fullPath,
      url_full: urlFull,
      url_thumb: urlThumb,
      url_small: urlSmall,
      url_medium: urlMedium,
      url_large: urlLarge,
      mime_type: mime,
      file_size: file.size,
      width,
      height,
    });

    return NextResponse.json({
      url: urlFull,
      id: media.id,
      path: media.path,
      url_thumb: media.url_thumb,
      url_small: media.url_small,
      url_medium: media.url_medium,
      url_large: media.url_large,
      width: media.width,
      height: media.height,
      created_at: media.created_at,
    });
  } catch (err) {
    console.error("Upload/process error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Errore elaborazione immagine" },
      { status: 500 }
    );
  }
}
