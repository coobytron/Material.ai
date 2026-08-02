const banks = {
  travel: {
    ari: [
      "Lock the dates and budget before choosing the destination. Then compare two complete trip packages instead of debating locations in the abstract.",
      "Treat the trip as a coordination problem first: shared reason, shared budget range, two viable weekends, then destination."
    ],
    mike: [
      "That optimizes the spreadsheet, not the trip. Decide why everyone actually wants to go before turning friendship into project management.",
      "Dates first can trap everyone in the worst-priced weekend. Compare complete scenarios before freezing one variable."
    ],
    final: [
      "Choose the reason for the trip first, then compare two complete date-budget-destination packages. Next move: each person submits one viable package.",
      "Protect the friendship from the logistics. Agree on purpose and budget, shortlist two weekends, and rotate ownership of decisions."
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
      "Score utility, longevity, and genuine desire. Next move: wait 48 hours, then write the first three times you will use it.",
      "Compare total ownership, not sticker price. Include repairability, resale, and dependency risk before deciding."
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
  if (/\b(project|build|launch|design|app|website|repo|feature)\b/.test(text)) return "project";
  if (/\b(buy|purchase|cost|price|worth|upgrade)\b/.test(text)) return "purchase";
  return "default";
}

export function calculateConsensus(prompt) {
  return 34 + (hashString(prompt) % 38);
}

export function simulateDemoDebate(prompt) {
  const cleaned = prompt.trim();
  if (!cleaned) throw new Error("A prompt is required.");
  const topic = classifyTopic(cleaned);
  const seed = hashString(cleaned);
  const bank = banks[topic];
  const pick = (list, offset = 0) => list[(seed + offset) % list.length];

  return {
    mode: "demo",
    model: "Material deterministic engine",
    consensus: calculateConsensus(cleaned),
    turns: [
      {agent: "ari", label: "ARI / OPENING", text: pick(bank.ari)},
      {agent: "mike", label: "MIKE / COUNTERPOINT", text: pick(bank.mike, 1)},
      {agent: "ari", label: "ARI / FINAL MOVE", text: pick(bank.final, 2)}
    ]
  };
}
