import assert from "node:assert/strict";
import test from "node:test";
import { parseAudioPlaybackState, serializeAudioPlaybackState } from "@/lib/audioPlayback";

test("serializes and parses a valid playback state", () => {
  const stored = serializeAudioPlaybackState({ position: 123.5, rate: 1.25 });
  assert.deepEqual(parseAudioPlaybackState(stored), { position: 123.5, rate: 1.25 });
});

test("rejects malformed or unsupported playback states", () => {
  assert.equal(parseAudioPlaybackState(null), null);
  assert.equal(parseAudioPlaybackState("not-json"), null);
  assert.equal(parseAudioPlaybackState('{"position":-1,"rate":1}'), null);
  assert.equal(parseAudioPlaybackState('{"position":10,"rate":3}'), null);
});
