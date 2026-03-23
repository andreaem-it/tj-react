/**
 * Cloudflare R2 (compatibile S3). Upload e listing media.
 * Env: CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
 */

import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;

export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";

function getClient(): S3Client {
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2: mancano CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID o R2_SECRET_ACCESS_KEY");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });
}

export function isR2Configured(): boolean {
  return !!(accountId && accessKeyId && secretAccessKey && bucket);
}

export interface R2ObjectSummary {
  key: string;
  size: number;
  lastModified?: string;
}

let cachedList: {
  prefix: string;
  maxTotal: number;
  fetchedAt: number;
  items: R2ObjectSummary[];
} | null = null;

const LIST_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minuti

export async function r2Put(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  if (!bucket) throw new Error("R2: manca R2_BUCKET_NAME");
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function r2List(prefix: string, maxKeys = 500): Promise<string[]> {
  if (!bucket) return [];
  const client = getClient();
  const out = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
    })
  );
  const keys = (out.Contents ?? []).map((c) => c.Key).filter((k): k is string => !!k);
  return keys;
}

export async function r2ListWithMeta(
  prefix: string,
  maxTotal = 100000
): Promise<R2ObjectSummary[]> {
  if (!bucket) return [];

  const now = Date.now();
  if (
    cachedList &&
    cachedList.prefix === prefix &&
    cachedList.maxTotal === maxTotal &&
    now - cachedList.fetchedAt < LIST_CACHE_TTL_MS
  ) {
    return cachedList.items;
  }

  const client = getClient();
  const results: R2ObjectSummary[] = [];
  let continuationToken: string | undefined;

  do {
    const out: ListObjectsV2CommandOutput = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      })
    );

    const batch =
      out.Contents?.filter((c) => !!c.Key).map((c) => ({
        key: c.Key as string,
        size: c.Size ?? 0,
        lastModified: c.LastModified ? c.LastModified.toISOString() : undefined,
      })) ?? [];

    results.push(...batch);

    if (results.length >= maxTotal || !out.IsTruncated) {
      break;
    }
    continuationToken = out.NextContinuationToken;
  } while (continuationToken);

  const finalItems = results.slice(0, maxTotal);

  cachedList = {
    prefix,
    maxTotal,
    fetchedAt: now,
    items: finalItems,
  };

  return finalItems;
}

export async function r2Delete(key: string): Promise<void> {
  if (!bucket) return;
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

/** Restituisce l'URL pubblico per una key (R2_PUBLIC_URL + key) */
export function publicUrl(key: string): string {
  const base = R2_PUBLIC_URL || "";
  if (!base) return "";
  const k = key.startsWith("/") ? key.slice(1) : key;
  return `${base}/${k}`;
}
