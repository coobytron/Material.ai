import test from "node:test";
import assert from "node:assert/strict";
import {calculateConsensus, classifyTopic, hashString, simulateDemoDebate} from "../public/engine.js";

test("hash is deterministic", () => {
  assert.equal(hashString("same"), hashString("same"));
  assert.notEqual(hashString("same"), hashString("different"));
});

test("topics classify", () => {
  assert.equal(classifyTopic("Take a trip"), "travel");
  assert.equal(classifyTopic("Build an app"), "project");
  assert.equal(classifyTopic("Worth buying"), "purchase");
  assert.equal(classifyTopic("What now?"), "default");
});

test("consensus remains bounded", () => {
  const value = calculateConsensus("question");
  assert.ok(value >= 34 && value <= 71);
});

test("debate order is Ari, Mike, Ari", () => {
  const result = simulateDemoDebate("Should we build an app?");
  assert.deepEqual(result.turns.map(turn => turn.agent), ["ari","mike","ari"]);
  assert.ok(result.turns.every(turn => turn.text.length > 20));
});

test("empty prompt is rejected", () => {
  assert.throws(() => simulateDemoDebate("  "), /required/i);
});
