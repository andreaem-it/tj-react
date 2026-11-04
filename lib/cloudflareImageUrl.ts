export function withCloudflareImageAspect(src: string, width: number, height: number): string {
  try {
    const url = new URL(src);
    if (url.protocol !== "https:" || url.hostname !== "static.techjournal.it") return src;
    url.searchParams.set("ar", `${width}x${height}`);
    return url.toString();
  } catch {
    return src;
  }
}
