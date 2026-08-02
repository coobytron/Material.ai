import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateConfidence,
  calculateConsensus,
  classifyTopic,
  hashString,
  normalizeDecisionInput,
  normalizeWorkflow,
  simulateDemoDebate
} from "../public/engine.js";

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

test("workflows normalize safely", () => {
  assert.equal(normalizeWorkflow("plan"), "plan");
  assert.equal(normalizeWorkflow("unknown"), "decide");
  assert.deepEqual(normalizeDecisionInput({workflow: "compare", constraints: "  $500  "}), {
    workflow: "compare",
    constraints: "$500",
    success: ""
  });
});

test("legacy consensus remains bounded", () => {
  const value = calculateConsensus("question");
  assert.ok(value >= 34 && value <= 71);
});

test("confidence is bounded and rewards useful context", () => {
  const bare = calculateConfidence("Should we build this?", {workflow: "decide"});
  const detailed = calculateConfidence("Should we build this?", {
    workflow: "decide",
    constraints: "Two weeks and no new dependencies",
    success: "Five people complete the workflow"
  });
  assert.ok(bare >= 48 && bare <= 70);
  assert.ok(detailed > bare);
  assert.ok(detailed <= 88);
});

test("debate order is Ari, Mike, Ari", () => {
  const result = simulateDemoDebate("Should we build an app?", {workflow: "stress-test"});
  assert.deepEqual(result.turns.map(turn => turn.agent), ["ari", "mike", "ari"]);
  assert.ok(result.turns.every(turn => turn.text.length > 20));
});

test("every debate returns a complete decision brief", () => {
  const result = simulateDemoDebate("Compare buying a printer with using a service", {
    workflow: "compare",
    constraints: "$800 maximum",
    success: "Lower cost after one year"
  });
  assert.equal(result.workflow, "compare");
  assert.ok(result.confidence >= 48 && result.confidence <= 88);
  assert.ok(result.brief.recommendation.length > 20);
  assert.ok(result.brief.strongest_objection.length > 20);
  assert.ok(result.brief.next_action.length > 20);
  assert.ok(result.brief.assumptions.length >= 2);
});

test("demo output is deterministic for the full input", () => {
  const input = {workflow: "plan", constraints: "One weekend", success: "Working prototype"};
  assert.deepEqual(
    simulateDemoDebate("Build a useful decision tool", input),
    simulateDemoDebate("Build a useful decision tool", input)
  );
});

test("empty prompt is rejected", () => {
  assert.throws(() => simulateDemoDebate("  "), /required/i);
});
