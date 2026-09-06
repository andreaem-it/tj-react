import assert from "node:assert/strict";
import { test } from "node:test";
import { reachedReadingCheckpoint, readingDepthPercent } from "../../lib/analytics/reading";

test("calcola e limita la profondità di lettura", () => {
  assert.equal(readingDepthPercent({ elementTop: 100, elementHeight: 1000, viewportBottom: 600 }), 50);
  assert.equal(readingDepthPercent({ elementTop: 100, elementHeight: 1000, viewportBottom: 50 }), 0);
  assert.equal(readingDepthPercent({ elementTop: 100, elementHeight: 1000, viewportBottom: 1500 }), 100);
  assert.equal(readingDepthPercent({ elementTop: 0, elementHeight: 0, viewportBottom: 500 }), 0);
});

test("emette soltanto il checkpoint più alto non ancora inviato", () => {
  assert.equal(reachedReadingCheckpoint(24, 0), null);
  assert.equal(reachedReadingCheckpoint(52, 0), 50);
  assert.equal(reachedReadingCheckpoint(92, 50), 90);
  assert.equal(reachedReadingCheckpoint(100, 90), null);
});
