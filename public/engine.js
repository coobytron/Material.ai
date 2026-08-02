// Material.ai local engine.
// Runs entirely in the browser or in Node with no network, no API key, and no
// dependencies. It reads the prompt, extracts the decision structure, and
// composes an Ari -> Mike -> Ari exchange from that structure, so the same
// question always returns the same debate and different questions do not.

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
  shared: /\bwe\b|\bus\b|\bour\b|\bteam\b|\beveryone\b|\bpartner\b|\bfriends?\b|\bfamily\b|\bcofounder|\bboth\s+of\b|\bthe\s+(?:two|three|four)\s+of\b/i,
  reversible: /\btry\b|\btest\b|\bpilot\b|\btrial\b|\bexperiment|\bprototype|\brent\b|\bborrow|\bbeta\b|\bdraft\b|\bfor\s+now\b/i,
  irreversible: /\bquit\b|\bsell\b|\bmove\s+(?:to|out|away)|\bmarry|\bfire\b|\bdelete|\bshut\s+down|\bsign\b|\bcontract|\bpermanent|\blay\s+off|\bpublish|\bannounce|\bmigrate/i,
  risk: /\brisk|\bsafe\b|\bdanger|\bfail|\blose\b|\blosing\b|\bdownside|\bworst\s+case|\bregret/i,
  people: /\bhire\b|\bfire\b|\bteam\b|\bmanager|\breport|\bcofounder|\bfriend|\brelationship|\bpartner/i
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
  if (/\b(project|build|launch|design|app|website|repo|feature)\b/.test(text)) return "project";
  if (/\b(buy|purchase|cost|price|worth|upgrade)\b/.test(text)) return "purchase";
  return "default";
}

function tidy(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:—-]+/, "")
    .replace(/[\s,;:.!?]+$/, "")
    .trim();
}

function shorten(value, words = 12) {
  const parts = value.split(" ");
  return parts.length <= words ? value : `${parts.slice(0, words).join(" ")}…`;
}

// Strips the interrogative wrapper so the remainder reads as an action phrase:
// "Should we ship Friday or wait?" -> "ship Friday or wait".
function extractSubject(text) {
  let subject = tidy(text);
  // Wrappers stack ("Is it worth buying…" is a lead plus a worth), so peel in
  // passes and stop as soon as a pass changes nothing.
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
  // "coffee or tea" is a choice; "should we or should we not" is not worth splitting.
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

// Consensus is a read on how far apart the two agents actually land: concrete
// constraints and reversible stakes pull them together, open-ended or
// irreversible questions push them apart.
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

function jabKey(signals) {
  if (signals.irreversible) return "irreversible";
  if (signals.people) return "people";
  if (signals.reversible) return "reversible";
  if (signals.risk) return "risk";
  if (signals.money) return "money";
  if (signals.deadline) return "deadline";
  if (signals.shared) return "shared";
  return "none";
}

function closeKey(signals) {
  if (signals.deadline) return "deadline";
  if (signals.shared) return "shared";
  if (signals.money) return "money";
  return "default";
}

export function runLocalDebate(prompt) {
  const cleaned = typeof prompt === "string" ? prompt.trim() : "";
  if (!cleaned) throw new Error("A prompt is required.");

  const state = analyze(cleaned);
  const {kind, options, seed, signals} = state;
  const angles = ["structure", "cost", "evidence"];
  const angle = angles[seed % angles.length];
  const view = {
    subject: state.subject,
    a: options[0] || state.subject,
    b: options[1] || state.subject
  };

  const moves = banks.move[angle];
  const ari = [
    fill(banks.frame[angle][kind], view),
    banks.constraint[constraintKey(signals)],
    fill(kind === "choice" ? moves.choice : moves.default, view)
  ].join(" ");

  const rebuttals = banks.rebut[angle];
  const mike = [
    rebuttals[(seed >>> 3) % rebuttals.length],
    banks.jab[jabKey(signals)]
  ].join(" ");

  const final = [
    banks.concede[angle],
    fill(banks.rule[kind], view),
    fill(banks.close[closeKey(signals)], view)
  ].join(" ");

  return {
    mode: "local",
    model: "Material local engine",
    consensus: calculateConsensus(cleaned),
    analysis: {kind, angle, options, topic: state.topic, signals},
    turns: [
      {agent: "ari", label: "ARI / OPENING", text: ari},
      {agent: "mike", label: "MIKE / COUNTERPOINT", text: mike},
      {agent: "ari", label: "ARI / FINAL MOVE", text: final}
    ]
  };
}
