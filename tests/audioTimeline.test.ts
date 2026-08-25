import assert from "node:assert/strict";
import test from "node:test";
import { audioElapsedTime, audioPositionAtTime, audioTotalDuration } from "@/lib/audioTimeline";

test("calcola durata e posizione globali attraverso più segmenti", () => {
  const durations = [30, 45, 25];
  assert.equal(audioTotalDuration(durations), 100);
  assert.equal(audioElapsedTime(durations, 1, 12), 42);
  assert.deepEqual(audioPositionAtTime(durations, 42), { segment: 1, localTime: 12 });
});

test("i confini passano al segmento successivo", () => {
  assert.deepEqual(audioPositionAtTime([30, 45], 30), { segment: 1, localTime: 0 });
  assert.deepEqual(audioPositionAtTime([30, 45], 75), { segment: 1, localTime: 45 });
});

test("valori non validi vengono limitati senza propagare NaN", () => {
  assert.equal(audioTotalDuration([10, Number.NaN, -4]), 10);
  assert.deepEqual(audioPositionAtTime([10, 20], -5), { segment: 0, localTime: 0 });
  assert.deepEqual(audioPositionAtTime([], 20), { segment: 0, localTime: 0 });
});
