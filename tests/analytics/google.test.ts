import assert from "node:assert/strict";
import { test } from "node:test";
import {
  consentPermissions,
  googleConsent,
  pageTypeForPath,
  sendGooglePageView,
  syncGoogleAnalytics,
} from "../../lib/analytics/google";

const id = "G-TEST";
const denied = { measurement: false, marketing: false };
const measurementOnly = { measurement: true, marketing: false };
const granted = { measurement: true, marketing: true };
const page = (path: string) => ({ path, location: `https://example.test${path}`, title: path, type: "news" });
const commands = (target: Window) => (target.dataLayer ?? []).map((item) => Array.from(item as IArguments));

test("missing, loading and partial preferences never grant implicit consent", () => {
  assert.deepEqual(consentPermissions(undefined), denied);
  assert.deepEqual(consentPermissions({ hasBeenLoaded: false, gdprPurposes: granted }), denied);
  assert.deepEqual(consentPermissions({ hasBeenLoaded: true, gdprPurposes: { measurement: true } }), measurementOnly);
  assert.deepEqual(googleConsent(measurementOnly), {
    analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
  });
});

test("default denied precedes configuration; late consent queues exactly one initial page view", () => {
  const target = {} as Window;
  assert.equal(sendGooglePageView(target, id, page("/a")), false);
  syncGoogleAnalytics(target, id, denied);
  assert.equal(commands(target).some(([command]) => command === "config"), false);
  syncGoogleAnalytics(target, id, measurementOnly);
  assert.equal(sendGooglePageView(target, id, page("/a")), true);
  syncGoogleAnalytics(target, id, measurementOnly); // StrictMode / repeated ready event
  assert.equal(sendGooglePageView(target, id, page("/a")), false);
  const queued = commands(target);
  assert.deepEqual(queued[0], ["consent", "default", googleConsent(denied)]);
  assert.deepEqual(queued.filter(([command]) => command === "config"), [["config", id, { send_page_view: false }]]);
  assert.equal(queued.filter(([command, name]) => command === "event" && name === "page_view").length, 1);
});

test("navigation, back/forward and query changes count once; revocation blocks new page views", () => {
  const target = {} as Window;
  syncGoogleAnalytics(target, id, granted);
  for (const path of ["/a", "/b", "/a", "/b", "/b?q=1"]) {
    assert.equal(sendGooglePageView(target, id, page(path)), true);
    assert.equal(sendGooglePageView(target, id, page(path)), false);
  }
  syncGoogleAnalytics(target, id, denied);
  assert.deepEqual(commands(target).at(-1), ["consent", "update", googleConsent(denied)]);
  assert.equal(sendGooglePageView(target, id, page("/c")), false);
  syncGoogleAnalytics(target, id, measurementOnly);
  assert.equal(sendGooglePageView(target, id, page("/c")), true);
  assert.equal(commands(target).filter(([command]) => command === "config").length, 1);
  assert.equal(sendGooglePageView(target, "G-OTHER", page("/d")), false);
});

test("marketing-only consent never enables page measurement", () => {
  const target = {} as Window;
  syncGoogleAnalytics(target, id, { measurement: false, marketing: true });
  assert.equal(sendGooglePageView(target, id, page("/a")), false);
  assert.deepEqual(commands(target).at(-1), ["consent", "update", googleConsent({ measurement: false, marketing: true })]);
});

test("page types distinguish articles and product tools without broad prefix matches", () => {
  assert.equal(pageTypeForPath("/"), "home");
  assert.equal(pageTypeForPath("/apple/test", "guide"), "guide");
  assert.equal(pageTypeForPath("/price-radar/B0123"), "price_radar");
  assert.equal(pageTypeForPath("/compatibility/iphone"), "compatibility");
  assert.equal(pageTypeForPath("/price-radar-other"), "other");
});
