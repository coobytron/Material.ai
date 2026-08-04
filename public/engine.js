// Material.ai local decision engine.
// Runs in the browser or Node with no network, API key, or dependencies.

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

// Longest pronoun alternatives first, each with required trailing space, so
// "Is it worth…" strips "Is it " rather than the "i" inside "it".
const LEAD = /^(?:so\s+|ok(?:ay)?,?\s+|hey,?\s+)?(?:should|shall|do|does|did|is|are|was|can|could|would|will|must|ought)\s+(?:(?:they|she|our|you|he|it|we|us|my|i)\s+)?/i;
const HOWTO = /^(?:how\s+(?:do|should|can|would|might)\s+(?:i|we|you|they)\s*|what(?:'|’)?s\s+the\s+best\s+way\s+to\s+|what\s+is\s+the\s+best\s+way\s+to\s+)/i;
const TIMING = /^when\s+(?:should|do|can|would|will)\s+(?:i|we|you|they)\s*/i;
const WORTH = /^(?:is\s+it\s+)?worth\s+/i;
const SPLIT = /\s+(?:or|vs\.?|versus)\s+/i;

const SIGNALS = {
  money: /\$\s?[\d,]+|\b\d+\s?k\b|\bbudget|\bcost|\bprice|\bexpensive|\bafford|\bcheap|\bsalary|\bspend|\bpay\b|\bmoney\b|\bfunding\b/i,
  deadline: /\bdeadline|\bdue\b|\basap\b|\burgent|\b(?:mon|tues|wednes|thurs|fri|satur|sun)day\b|\bby\s+(?:next|the\s+end|then)|\bthis\s+(?:week|month|quarter|year)|\bnext\s+(?:week|month|quarter|year)|\btomorrow\b|\bq[1-4]\b/i,
  shared: /\bwe\b|\bus\b|\bour\b|\bteam\b|\beveryone\b|\bpartner\b|\bfriends?\b|\bfamily\b|\bcofounder\b|\bboth\s+of\b|\bthe\s+(?:two|three|four)\s+of\b/i,
  reversible: /\btry\b|\btest\b|\bpilot\b|\btrial\b|\bexperiment|\bprototype|\brent\b|\bborrow|\bbeta\b|\bdraft\b|\bfor\s+now\b/i,
  irreversible: /\bquit\b|\bsell\b|\bmove\s+(?:to|out|away)|\bmarry|\bfire\b|\bdelete|\bshut\s+down|\bsign\b|\bcontract\b|\bpermanent|\blay\s+off|\bpublish|\bannounce|\bmigrate/i,
  risk: /\brisk|\bsafe\b|\bdanger|\bfail|\blose\b|\blosing\b|\bdownside|\bworst\s+case|\bregret/i,
  people: /\bhire\b|\bfire\b|\bteam\b|\bmanager|\breport|\bcofounder\b|\bfriend\b|\brelationship|\bpartner/i
};

const banks = {
  frame: {
    structure: {
      choice: 'Treat “{a}” and “{b}” as two different bets, not two options. They optimize for different outcomes, and until you name which outcome matters the comparison is unwinnable.',
      binary: 'The question behind “{subject}” hides two decisions: what outcome you are actually buying, and which tradeoff you will accept to get it.',
      howto: 'There is no best way to {subject} in the abstract. There is a best way given one goal, one constraint, and one deadline, so fix those three first.',
      timing: 'Timing questions are usually disguised readiness questions. Define what has to be true before you {subject}, and the date answers itself.',
      open: 'Break “{subject}” into the decision, the constraint, and the owner. Most of the difficulty here is that all three are still implicit.'
    },
    cost: {
      choice: 'Compare “{a}” and “{b}” on total cost of being wrong, not on which sounds better today. One of them is far cheaper to reverse, and that asymmetry should decide it.',
      binary: 'Price “{subject}” by its downside, not its upside. The upside is why you are asking; the downside is what you will actually have to live with.',
      howto: 'Sequence the work on {subject} by what fails loudest. Do the step that would kill the plan first, while stopping is still cheap.',
      timing: 'The cost of waiting on {subject} is real but invisible, so write it down. Compare it against the cost of moving early with incomplete information.',
      open: 'Put a number on both sides of “{subject}” — the cost of acting and the cost of doing nothing. The second one is the one people forget.'
    },
    evidence: {
      choice: 'Neither “{a}” nor “{b}” has to be decided in full today. Find the smallest step that produces evidence about which one is right, and take that step instead.',
      binary: 'Convert “{subject}” from an opinion into a test. Name the one piece of evidence that would flip your answer, then go get it.',
      howto: 'Build the smallest version of {subject} that tests the riskiest assumption. Anything larger is production work disguised as a decision.',
      timing: 'Do not pick a date for {subject} yet. Pick the signal that means it is time, and watch for it.',
      open: 'Turn “{subject}” into an experiment with one owner and one success test. Ambiguity survives discussion; it rarely survives a real trial.'
    }
  },
  constraint: {
    both: 'You have both a number and a clock in play, which is good news — that makes this bounded. Write the ceiling and the date down before arguing about anything else.',
    money: 'Cost is doing the real work here. Name the maximum you will spend and the regret trigger that would mean you overpaid.',
    deadline: 'The timing pressure is the binding constraint. Decide what must be true by that date rather than what would be ideal with unlimited runway.',
    shared: 'More than one person carries this outcome, so agreement on the goal has to come before agreement on the tactic.',
    none: 'No hard constraint appears in the question, which usually means the real limit is unstated. Surface it before you choose anything.'
  },
  move: {
    structure: {
      choice: 'Next move: write one sentence for each option describing the world six months after choosing it.',
      default: 'Next move: write the decision as a single sentence with an owner and a date attached.'
    },
    cost: {
      choice: 'Next move: list what you lose under each option, then pick the loss you can actually absorb.',
      default: 'Next move: write down the worst realistic outcome and who absorbs it.'
    },
    evidence: {
      choice: 'Next move: define the cheapest test that would tell you “{a}” is wrong.',
      default: 'Next move: name the evidence that would change your mind, and the date you will have it.'
    }
  },
  rebut: {
    structure: [
      'That is a clean frame and it still postpones the decision. Naming the outcome you are optimizing for is a paragraph of work; you are describing it as if it were the answer.',
      'Splitting this into decision, constraint, and owner sounds rigorous, but it converts one hard judgment into three easier ones and never makes the hard one.'
    ],
    cost: [
      'Downside accounting quietly assumes the downside is knowable. The expensive failures here are the ones nobody thought to price.',
      'Optimizing for cheap-to-reverse systematically picks the timid option. Sometimes the costly, hard-to-undo choice is the only one that actually changes anything.'
    ],
    evidence: [
      'A small test validates the easy part. It will tell you the mechanics work and nothing about whether this was worth doing.',
      '“Run an experiment” is what people say when they do not want to state a preference. Some choices need judgment now, not another round of data.'
    ]
  },
  jab: {
    reversible: 'You have also already decided it is reversible. Half the things people call a trial are load-bearing within a month.',
    irreversible: 'And this is not reversible. Whatever process you pick, it has to be one that survives being wrong, because you will not get to retry it.',
    people: 'This is a people decision wearing an analysis costume. The spreadsheet will be right and the room will still not agree.',
    risk: 'You named the risk and then routed around it. Say plainly what happens in the bad case and who is holding it.',
    money: 'And the number is not the constraint you think it is. Sticker price is the smallest part of what this costs over a year.',
    deadline: 'You are also treating that date as if it were handed down. Ask who set it and what actually breaks if it slips — often the answer is nothing.',
    shared: 'And the group has not agreed on the question yet, only on the fact that it is unresolved. Process will not fix that; someone stating a preference will.',
    none: 'Mostly this is still a well-organized way of not answering the question that was asked.'
  },
  concede: {
    structure: 'Fair — the frame was doing work the decision should be doing.',
    cost: 'Granted: pricing the downside can talk you out of the only move that matters.',
    evidence: 'Correct that a test can validate the wrong half of this.'
  },
  rule: {
    choice: 'So decide it this way: if the two paths differ mostly in cost, take “{a}”; if they differ in what you become, take the one you would defend out loud.',
    binary: 'So decide it this way: if being wrong is recoverable, act now and correct later; if it is not, buy one round of evidence and no more.',
    howto: 'So decide it this way: do the step that fails loudest first, and let that result pick the rest of the sequence.',
    timing: 'So decide it this way: name the one condition that means go, and go the day it is true.',
    open: 'So decide it this way: state the outcome you want in one sentence, then take the smallest action nobody has to approve.'
  },
  close: {
    deadline: 'Concrete next move: write the one-sentence version of “{subject}” today, with the owner named, and hold it against the date already in play.',
    shared: 'Concrete next move: each person writes their preferred answer to “{subject}” privately, then compare — you will find you were arguing about different questions.',
    money: 'Concrete next move: write the ceiling number for “{subject}” down today. If nobody will write it, that is your answer.',
    default: 'Concrete next move: put “{subject}” in one sentence with an owner and a review date, and send it to the person who can say no.'
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

function tidy(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:—-]+/, "")
    .replace(/[\s,;:.!?]+$/, "")
    .trim();
}

function shorten(value, words = 12) {
  const parts = value.split(" ");
  return parts.length <= words ? value : `${parts.slice(0, words).join(" ")}…`;
}

function extractSubject(text) {
  let subject = tidy(text);
  for (let pass = 0; pass < 3; pass += 1) {
    const before = subject;
    for (const pattern of [HOWTO, TIMING, LEAD, WORTH]) {
      if (pattern.test(subject)) {
        const stripped = tidy(subject.replace(pattern, ""));
        if (stripped) subject = stripped;
        break;
      }
    }
    if (subject === before) break;
  }
  return subject || tidy(text);
}

function extractOptions(subject) {
  if (!SPLIT.test(subject)) return [];
  const parts = subject.split(SPLIT).map(tidy).filter(Boolean);
  if (parts.length < 2) return [];
  const usable = parts.filter(part => part.length > 2 && part.split(" ").length <= 12);
  return usable.length >= 2 ? usable.slice(0, 2).map(part => shorten(part, 8)) : [];
}

function detectKind(text, options) {
  if (options.length >= 2) return "choice";
  if (TIMING.test(text)) return "timing";
  if (HOWTO.test(text)) return "howto";
  if (LEAD.test(text) || WORTH.test(text) || /\?\s*$/.test(text)) return "binary";
  return "open";
}

export function analyze(prompt) {
  const text = tidy(prompt);
  const subject = extractSubject(text);
  const options = extractOptions(subject);
  const signals = {};
  for (const [name, pattern] of Object.entries(SIGNALS)) signals[name] = pattern.test(text);

  return {
    text,
    subject: shorten(subject, 14),
    options,
    kind: detectKind(text, options),
    topic: classifyTopic(text),
    signals,
    seed: hashString(text.toLowerCase())
  };
}

export function calculateConsensus(prompt) {
  const {signals, kind, options, seed} = analyze(prompt);
  let score = 50;
  if (signals.money) score += 9;
  if (signals.deadline) score += 9;
  if (options.length >= 2) score += 8;
  if (signals.reversible) score += 6;
  if (signals.irreversible) score -= 11;
  if (signals.risk) score -= 5;
  if (signals.people) score -= 6;
  if (kind === "open") score -= 8;
  score += (seed % 9) - 4;
  return Math.min(92, Math.max(18, score));
}

export function calculateConfidence(prompt, input = {}) {
  const normalized = normalizeDecisionInput(input);
  let confidence = calculateConsensus(prompt);
  if (normalized.constraints) confidence += 6;
  if (normalized.success) confidence += 6;
  return Math.min(96, Math.max(18, confidence));
}

function fill(template, view) {
  return template.replace(/\{(\w+)\}/g, (match, key) => view[key] ?? match);
}

function constraintKey(signals) {
  if (signals.money && signals.deadline) return "both";
  if (signals.money) return "money";
  if (signals.deadline) return "deadline";
  if (signals.shared) return "shared";
  return "none";
}

function pickJab(signals) {
  for (const name of ["reversible", "irreversible", "people", "risk", "money", "deadline", "shared"]) {
    if (signals[name]) return name;
  }
  return "none";
}

function buildAssumptions(analysis, input) {
  const assumptions = [];
  if (input.constraints) assumptions.push(`The stated constraints are real: ${input.constraints}`);
  if (input.success) assumptions.push(`Success will be judged by: ${input.success}`);
  if (analysis.options.length >= 2) assumptions.push(`The live choice is between “${analysis.options[0]}” and “${analysis.options[1]}”.`);
  if (analysis.signals.irreversible) assumptions.push("The decision may be difficult or costly to reverse.");
  if (analysis.signals.shared) assumptions.push("More than one person owns the outcome.");
  if (!assumptions.length) assumptions.push("The prompt contains enough context for a first-pass recommendation.");
  if (assumptions.length < 2) assumptions.push("The next action should create evidence for a later review.");
  return assumptions.slice(0, 4);
}

export function runLocalDebate(prompt, input = {}) {
  const cleaned = typeof prompt === "string" ? prompt.trim() : "";
  if (!cleaned) throw new Error("A prompt is required.");

  const normalized = normalizeDecisionInput(input);
  const analysis = analyze(cleaned);
  const {kind, options, signals, subject} = analysis;
  const seed = hashString(JSON.stringify({prompt: cleaned, ...normalized}));
  const angle = ["structure", "cost", "evidence"][seed % 3];
  const view = {subject, a: options[0] || subject, b: options[1] || "the alternative"};
  const opening = [
    fill(banks.frame[angle][kind], view),
    fill(banks.constraint[constraintKey(signals)], view),
    workflows[normalized.workflow].instruction,
    fill(banks.move[angle][kind === "choice" ? "choice" : "default"], view)
  ].join(" ");
  const counterpoint = [
    banks.rebut[angle][(seed >>> 3) % banks.rebut[angle].length],
    banks.jab[pickJab(signals)]
  ].join(" ");
  const recommendation = [
    banks.concede[angle],
    fill(banks.rule[kind], view),
    fill(banks.close[constraintKey(signals)] || banks.close.default, view)
  ].join(" ");
  const specificNextAction = fill(
    banks.move[angle][kind === "choice" ? "choice" : "default"],
    view
  ).replace(/^Next move:\s*/i, "");
  const confidence = calculateConfidence(cleaned, normalized);

  return {
    mode: "local",
    model: "Material local engine v2",
    workflow: normalized.workflow,
    confidence,
    consensus: confidence,
    analysis,
    turns: [
      {agent: "ari", label: "ARI / OPENING", text: opening},
      {agent: "mike", label: "MIKE / COUNTERPOINT", text: counterpoint},
      {agent: "ari", label: "ARI / FINAL MOVE", text: recommendation}
    ],
    brief: {
      recommendation,
      strongest_objection: counterpoint,
      assumptions: buildAssumptions(analysis, normalized),
      next_action: specificNextAction || workflows[normalized.workflow].nextActions[seed % 2]
    }
  };
}

// Backward-compatible name retained for V1/V2 browser code and stored sessions.
export function simulateDemoDebate(prompt, input = {}) {
  return runLocalDebate(prompt, input);
}
