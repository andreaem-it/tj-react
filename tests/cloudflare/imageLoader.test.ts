import assert from "node:assert/strict";
import test from "node:test";
import cloudflareImageLoader from "@/lib/cloudflareImageLoader";
import { withCloudflareImageAspect } from "@/lib/cloudflareImageUrl";

test("adds the responsive width to TechJournal media URLs", () => {
  assert.equal(
    cloudflareImageLoader({ src: "https://static.techjournal.it/2026/10/photo.jpg", width: 640 }),
    "https://static.techjournal.it/2026/10/photo.jpg?v=responsive-2&w=640",
  );
});

test("preserves existing query parameters", () => {
  assert.equal(
    cloudflareImageLoader({ src: "https://static.techjournal.it/2026/10/photo.jpg?v=2", width: 960 }),
    "https://static.techjournal.it/2026/10/photo.jpg?v=responsive-2&w=960",
  );
});

test("leaves local and third-party images unchanged", () => {
  assert.equal(cloudflareImageLoader({ src: "/techjournal-logo.png", width: 256 }), "/techjournal-logo.png");
  assert.equal(cloudflareImageLoader({ src: "https://m.media-amazon.com/photo.jpg", width: 256 }), "https://m.media-amazon.com/photo.jpg");
});

test("adds a crop aspect ratio only to TechJournal media URLs", () => {
  assert.equal(
    withCloudflareImageAspect("https://static.techjournal.it/2026/10/photo.jpg", 16, 10),
    "https://static.techjournal.it/2026/10/photo.jpg?ar=16x10",
  );
  assert.equal(withCloudflareImageAspect("/techjournal-logo.webp", 16, 10), "/techjournal-logo.webp");
});
