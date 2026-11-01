import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  getTjApiBaseUrl,
  normalizeTjApiBaseUrl,
} from "../../lib/config/tjApi";

const originalTjApiBaseUrl = process.env.TJ_API_BASE_URL;

afterEach(() => {
  if (originalTjApiBaseUrl === undefined) {
    delete process.env.TJ_API_BASE_URL;
  } else {
    process.env.TJ_API_BASE_URL = originalTjApiBaseUrl;
  }
});

test("normalizes configured backend URLs", () => {
  assert.equal(normalizeTjApiBaseUrl("backend.example.com/"), "https://backend.example.com");
  assert.equal(normalizeTjApiBaseUrl("http://127.0.0.1:3002/"), "http://127.0.0.1:3002");
  assert.equal(normalizeTjApiBaseUrl(""), null);
});

test("reads TJ_API_BASE_URL lazily so build-time imports do not freeze runtime config", () => {
  delete process.env.TJ_API_BASE_URL;
  assert.equal(getTjApiBaseUrl(), null);

  process.env.TJ_API_BASE_URL = "backend.example.com";
  assert.equal(getTjApiBaseUrl(), "https://backend.example.com");
});
