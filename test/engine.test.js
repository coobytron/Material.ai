import test from "node:test";
import assert from "node:assert/strict";
import {
  analyze,
  calculateConfidence,
  calculateConsensus,
  classifyTopic,
  hashString,
  normalizeDecisionInput,
  normalizeWorkflow,
  runLocalDebate,
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

test("analysis extracts named options and deadline signals", () => {
  const result = analyze("Should we ship Friday or wait two weeks?");
  assert.equal(result.kind, "choice");
  assert.deepEqual(result.options, ["ship Friday", "wait two weeks"]);
  assert.equal(result.signals.deadline, true);
  assert.equal(result.signals.shared, true);
});

test("worth questions keep the full subject", () => {
  const result = analyze("Is it worth buying the printer?");
  assert.equal(result.subject, "buying the printer");
});

test("consensus is bounded", () => {
  for (const prompt of ["question", "Should I quit?", "Try a $500 pilot Friday?"]) {
    const value = calculateConsensus(prompt);
    assert.ok(value >= 18 && value <= 92);
  }
});

test("confidence is bounded and rewards useful context", () => {
  const bare = calculateConfidence("Should we build this?", {workflow: "decide"});
  const detailed = calculateConfidence("Should we build this?", {
    workflow: "decide",
    constraints: "Two weeks and no new dependencies",
    success: "Five people complete the workflow"
  });
  assert.ok(bare >= 18 && bare <= 92);
  assert.ok(detailed > bare);
  assert.ok(detailed <= 96);
});

test("debate order is Ari, Mike, Ari", () => {
  const result = runLocalDebate("Should we build an app?", {workflow: "stress-test"});
  assert.deepEqual(result.turns.map(turn => turn.agent), ["ari", "mike", "ari"]);
  assert.ok(result.turns.every(turn => turn.text.length > 20));
});

test("every debate returns a complete decision brief", () => {
  const result = runLocalDebate("Buy a printer or use a service?", {
    workflow: "compare",
    constraints: "$800 maximum",
    success: "Lower cost after one year"
  });
  assert.equal(result.mode, "local");
  assert.equal(result.workflow, "compare");
  assert.ok(result.confidence >= 18 && result.confidence <= 96);
  assert.ok(result.brief.recommendation.length > 20);
  assert.ok(result.brief.strongest_objection.length > 20);
  assert.ok(result.brief.next_action.length > 20);
  assert.ok(result.brief.assumptions.length >= 2);
});

test("local output is deterministic for the full input", () => {
  const input = {workflow: "plan", constraints: "One weekend", success: "Working prototype"};
  assert.deepEqual(
    runLocalDebate("Build a useful decision tool", input),
    runLocalDebate("Build a useful decision tool", input)
  );
});

test("named options appear in generated reasoning", () => {
  const result = runLocalDebate("Should we ship Friday or wait two weeks?");
  const text = result.turns.map(turn => turn.text).join(" ");
  assert.match(text, /ship Friday/i);
  assert.match(text, /wait two weeks/i);
});

test("irreversible language changes Mike's response", () => {
  const result = runLocalDebate("Should I quit my job and go freelance?");
  assert.match(result.turns[1].text, /not reversible/i);
});

test("generated output contains no unfilled placeholders", () => {
  const prompts = [
    "Should we ship Friday or wait two weeks?",
    "How should I build this prototype?",
    "When should we launch?",
    "This project needs a direction"
  ];
  for (const prompt of prompts) {
    const output = JSON.stringify(runLocalDebate(prompt));
    assert.doesNotMatch(output, /\{(?:subject|a|b)\}/);
  }
});

test("legacy function name remains compatible", () => {
  const input = {workflow: "decide"};
  assert.deepEqual(simulateDemoDebate("Should we proceed?", input), runLocalDebate("Should we proceed?", input));
});

test("empty prompt is rejected", () => {
  assert.throws(() => runLocalDebate("  "), /required/i);
});
