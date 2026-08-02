export const workflows = {
  decide: {
    label: "Decide",
    description: "Choose a direction and name the tradeoff.",
    instruction: "Make a clear recommendation instead of only listing options.",
    nextActions: [
      "Write the decision, assign one owner, and set a date to review whether it worked.",
      "Commit to the preferred option for one review cycle and record the condition that would reverse it."
    ]
  },
  "stress-test": {
    label: "Stress-test",
    description: "Try to break a plan before committing.",
    instruction: "Treat the proposal as a hypothesis and look for the cheapest way to disprove it.",
    nextActions: [
      "Run the cheapest test that could disprove the recommendation before investing further.",
      "Name the most dangerous assumption, assign an owner, and test it with real evidence."
    ]
  },
  plan: {
    label: "Plan",
    description: "Turn an idea into an ordered first move.",
    instruction: "Sequence the work around dependencies, ownership, and review gates.",
    nextActions: [
      "Put the first milestone on the calendar with one owner, one deliverable, and one acceptance test.",
      "Start the dependency that can block everything else, then schedule the first integration review."
    ]
  },
  compare: {
    label: "Compare",
    description: "Evaluate complete options against shared criteria.",
    instruction: "Compare complete scenarios rather than isolated features.",
    nextActions: [
      "Score the two strongest options against the same three criteria and choose the winner by a fixed deadline.",
      "Remove any option that violates a hard constraint, then compare the survivors by total cost and reversibility."
    ]
  }
};

const banks = {
  travel: {
    ari: [
      "Lock the purpose, budget range, and viable dates before choosing a destination. Then compare complete trip packages instead of debating locations in the abstract.",
      "Treat the trip as a coordination problem first: shared reason, shared budget range, two viable weekends, then destination."
    ],
    mike: [
      "That optimizes the spreadsheet, not the trip. Decide why everyone actually wants to go before turning friendship into project management.",
      "Dates first can trap everyone in the worst-priced weekend. Compare complete scenarios before freezing one variable."
    ],
    final: [
      "Choose the reason for the trip first, then compare two complete date-budget-destination packages. Protect the friendship by making tradeoffs visible instead of renegotiating them later.",
      "Agree on purpose and budget, shortlist two complete trip scenarios, and rotate ownership of the remaining decisions."
    ],
    assumptions: [
      "Everyone is willing to state a real budget range.",
      "The group values a good shared experience more than any single destination.",
      "At least two viable date windows exist."
    ]
  },
  project: {
    ari: [
      "Build the smallest artifact that tests the riskiest assumption. Give it one owner, one deadline, and one explicit success test.",
      "Separate direction from production. Approve the central idea first, then build only the path that proves it."
    ],
    mike: [
      "Small is not automatically useful. A tiny prototype can validate the easy part and miss the reason the project matters.",
      "One owner can become approval theater. Pair authority with a named veto criterion and an independent reviewer."
    ],
    final: [
      "Build the smallest version that tests the riskiest creative assumption, with one owner and one failure condition. Write the test before production.",
      "Approve the premise, assign one owner, and name the condition that kills the idea. Then produce one reviewable artifact."
    ],
    assumptions: [
      "The riskiest assumption can be tested independently.",
      "A named owner has enough authority to make tradeoffs.",
      "The team can agree on evidence before seeing the result."
    ]
  },
  purchase: {
    ari: [
      "Define the job, maximum cost, and regret trigger. Compare products against those constraints rather than marketing.",
      "Buy only if it removes recurring friction or creates a practice you will actually sustain."
    ],
    mike: [
      "A checklist can miss delight, longevity, and taste. Add the question the spreadsheet cannot answer: will you still want to use it?",
      "Calling it a hobby is not an argument against it. Sometimes the purchase is valuable because it creates a practice."
    ],
    final: [
      "Score utility, longevity, and genuine desire. Compare total ownership rather than sticker price, then wait long enough to see whether the use case survives.",
      "Buy only when the first three uses are concrete and the total cost, repair risk, and resale downside are acceptable."
    ],
    assumptions: [
      "The intended use will recur often enough to justify ownership.",
      "The total cost includes accessories, maintenance, and replacement risk.",
      "Waiting briefly will not remove the opportunity."
    ]
  },
  default: {
    ari: [
      "The question hides two decisions: what outcome matters and what tradeoff is acceptable. Make both explicit before choosing a tactic.",
      "Find the smallest reversible move that creates evidence without locking everyone into the wrong path."
    ],
    mike: [
      "Reversibility is overrated when delay has a cost. Name what gets worse while everyone gathers more evidence.",
      "That sounds precise but postpones judgment. Some choices require a clear preference, not another experiment."
    ],
    final: [
      "State the preferred outcome, the downside owner, and the cost of waiting. Then choose one action, one owner, and one review condition.",
      "Use reversible moves where delay is cheap. Where delay compounds risk, make the preference explicit and commit."
    ],
    assumptions: [
      "The desired outcome can be stated more clearly than the current prompt.",
      "Someone can own the downside if the decision is wrong.",
      "A review condition can be observed rather than debated."
    ]
  }
};

export function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function classifyTopic(prompt) {
  const text = prompt.toLowerCase();
  if (/\b(trip|travel|vacation|flight|hotel|weekend)\b/.test(text)) return "travel";
  if (/\b(project|build|launch|design|app|website|repo|feature|prototype)\b/.test(text)) return "project";
  if (/\b(buy|purchase|cost|price|worth|upgrade|product)\b/.test(text)) return "purchase";
  return "default";
}

export function normalizeWorkflow(value) {
  return Object.hasOwn(workflows, value) ? value : "decide";
}

function cleanOptional(value, limit = 1200) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export function normalizeDecisionInput(input = {}) {
  return {
    workflow: normalizeWorkflow(input.workflow),
    constraints: cleanOptional(input.constraints),
    success: cleanOptional(input.success)
  };
}

export function calculateConsensus(prompt) {
  return 34 + (hashString(prompt) % 38);
}

export function calculateConfidence(prompt, input = {}) {
  const normalized = normalizeDecisionInput(input);
  let confidence = 48 + (hashString(`${prompt}|${normalized.workflow}`) % 23);
  if (normalized.constraints) confidence += 7;
  if (normalized.success) confidence += 7;
  return Math.min(88, confidence);
}

function pick(list, seed, offset = 0) {
  return list[(seed + offset) % list.length];
}

function buildAssumptions(bank, seed, input) {
  const assumptions = [pick(bank.assumptions, seed), pick(bank.assumptions, seed, 1)];
  if (input.constraints) assumptions[0] = `The stated constraints are real: ${input.constraints}`;
  if (input.success) assumptions[1] = `Success will be judged by: ${input.success}`;
  return [...new Set(assumptions)].slice(0, 3);
}

export function simulateDemoDebate(prompt, input = {}) {
  const cleaned = typeof prompt === "string" ? prompt.trim() : "";
  if (!cleaned) throw new Error("A prompt is required.");

  const normalized = normalizeDecisionInput(input);
  const topic = classifyTopic(cleaned);
  const seed = hashString(JSON.stringify({prompt: cleaned, ...normalized}));
  const bank = banks[topic];
  const workflow = workflows[normalized.workflow];
  const opening = `${pick(bank.ari, seed)} ${workflow.instruction}`;
  const counterpoint = pick(bank.mike, seed, 1);
  const recommendation = pick(bank.final, seed, 2);
  const nextAction = pick(workflow.nextActions, seed, 3);
  const confidence = calculateConfidence(cleaned, normalized);

  return {
    mode: "demo",
    model: "Material deterministic engine v2",
    workflow: normalized.workflow,
    confidence,
    consensus: confidence,
    turns: [
      {agent: "ari", label: "ARI / OPENING", text: opening},
      {agent: "mike", label: "MIKE / COUNTERPOINT", text: counterpoint},
      {agent: "ari", label: "ARI / FINAL MOVE", text: recommendation}
    ],
    brief: {
      recommendation,
      strongest_objection: counterpoint,
      assumptions: buildAssumptions(bank, seed, normalized),
      next_action: nextAction
    }
  };
}
