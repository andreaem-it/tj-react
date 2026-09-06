import assert from "node:assert/strict";
import test from "node:test";
import {
  getRedirectUrl,
  unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server";
import nextConfig from "../next.config";

const cases = [
  {
    oldPath: "/apple/mac/apple-satellite-features-iphone",
    newPath: "/mac/apple-satellite-features-iphone",
  },
  {
    oldPath: "/apple/iphone/8-motivi-per-aspettare-iphone-18-pro",
    newPath: "/iphone/8-motivi-per-aspettare-iphone-18-pro",
  },
  {
    oldPath:
      "/applicazioni/ios/wallet-potrebbe-mostrare-il-saldo-anche-di-altre-carte-su-ios-17",
    newPath: "/ios/wallet-potrebbe-mostrare-il-saldo-anche-di-altre-carte-su-ios-17",
  },
  {
    oldPath: "/games/playstation/sony-presenta-ps5-e-ps5-digital-edition",
    newPath: "/playstation/sony-presenta-ps5-e-ps5-digital-edition",
  },
  {
    oldPath: "/applicazioni/macos/apple-presenta-macos-14-sonoma/amp",
    newPath: "/macos/apple-presenta-macos-14-sonoma",
  },
  {
    oldPath: "/apple/tim-cook-anticipa-piani-50-anniversario-apple/feed",
    newPath: "/apple/tim-cook-anticipa-piani-50-anniversario-apple",
  },
] as const;

for (const { oldPath, newPath } of cases) {
  test(`${oldPath} permanently redirects to ${newPath}`, async () => {
    const response = await unstable_getResponseFromNextConfig({
      url: `https://www.techjournal.it${oldPath}`,
      nextConfig,
    });

    assert.equal(response.status, 308);
    assert.equal(
      getRedirectUrl(response),
      `https://www.techjournal.it${newPath}`,
    );
  });
}

test("legacy redirects preserve query parameters", async () => {
  const response = await unstable_getResponseFromNextConfig({
    url: "https://www.techjournal.it/apple/ipad/example?share=x&nb=1",
    nextConfig,
  });

  assert.equal(response.status, 308);
  assert.equal(
    getRedirectUrl(response),
    "https://www.techjournal.it/ipad/example?share=x&nb=1",
  );
});
