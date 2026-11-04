"use client";

type ImageLoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

export default function cloudflareImageLoader({ src, width }: ImageLoaderProps): string {
  try {
    const url = new URL(src);
    if (url.protocol !== "https:" || url.hostname !== "static.techjournal.it") return src;
    url.searchParams.set("v", "responsive-2");
    url.searchParams.set("w", String(width));
    return url.toString();
  } catch {
    return src;
  }
}
