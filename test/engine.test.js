import test from "node:test";
import assert from "node:assert/strict";
import {analyze, calculateConsensus, classifyTopic, hashString, runLocalDebate} from "../public/engine.js";

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

test("question kinds classify", () => {
  assert.equal(analyze("Should we ship Friday or wait two weeks?").kind, "choice");
  assert.equal(analyze("Should we hire a second designer?").kind, "binary");
  assert.equal(analyze("How do we cut onboarding time?").kind, "howto");
  assert.equal(analyze("When should we announce the rebrand?").kind, "timing");
  assert.equal(analyze("The pricing page is a mess").kind, "open");
});

test("options are extracted from either-or questions", () => {
  const {options} = analyze("Should we ship Friday or wait two weeks?");
  assert.deepEqual(options, ["ship Friday", "wait two weeks"]);
  assert.deepEqual(analyze("Should we hire a second designer?").options, []);
});

test("the interrogative wrapper is stripped from the subject", () => {
  assert.equal(analyze("Should we hire a second designer?").subject, "hire a second designer");
  assert.equal(analyze("How do we cut onboarding time?").subject, "cut onboarding time");
});

test("signals come from the prompt", () => {
  const {signals} = analyze("Should we spend $4,000 on new laptops before Friday?");
  assert.ok(signals.money);
  assert.ok(signals.deadline);
  assert.ok(signals.shared);
  assert.equal(signals.irreversible, false);
});

test("consensus is bounded and prompt-dependent", () => {
  for (const prompt of ["question", "Should we sell the company?", "Spend $500 by Friday or wait?"]) {
    const value = calculateConsensus(prompt);
    assert.ok(value >= 18 && value <= 92, `${prompt} -> ${value}`);
  }
  assert.notEqual(calculateConsensus("Should we sell the company?"), calculateConsensus("Try a new logo for a week?"));
});

test("debate order is Ari, Mike, Ari", () => {
  const result = runLocalDebate("Should we build an app?");
  assert.deepEqual(result.turns.map(turn => turn.agent), ["ari","mike","ari"]);
  assert.ok(result.turns.every(turn => turn.text.length > 20));
});

test("debate is deterministic for the same prompt", () => {
  const prompt = "Should we ship Friday or wait two weeks?";
  assert.deepEqual(runLocalDebate(prompt), runLocalDebate(prompt));
});

test("different prompts produce different debates", () => {
  const one = runLocalDebate("Should we ship Friday or wait two weeks?");
  const two = runLocalDebate("Should we sell the company?");
  assert.notEqual(one.turns[0].text, two.turns[0].text);
});

test("the debate quotes the actual question", () => {
  const result = runLocalDebate("Should we ship Friday or wait two weeks?");
  const all = result.turns.map(turn => turn.text).join(" ");
  assert.match(all, /ship Friday/);
  assert.match(all, /wait two weeks/);
});

test("no template placeholder survives into output", () => {
  const prompts = [
    "Should we ship Friday or wait two weeks?",
    "Should we hire a second designer?",
    "How do we cut onboarding time?",
    "When should we announce the rebrand?",
    "The pricing page is a mess",
    "Is it worth buying a $3000 espresso machine?",
    "Should I quit and go freelance?"
  ];
  for (const prompt of prompts) {
    for (const turn of runLocalDebate(prompt).turns) {
      assert.doesNotMatch(turn.text, /[{}]/, `${prompt} -> ${turn.text}`);
    }
  }
});

test("empty prompt is rejected", () => {
  assert.throws(() => runLocalDebate("  "), /required/i);
});
