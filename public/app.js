import {
  calculateConfidence,
  normalizeDecisionInput,
  simulateDemoDebate,
  workflows
} from "./engine.js";

const $ = selector => document.querySelector(selector);
const form = $("#prompt-form");
const input = $("#prompt");
const workflowInput = $("#workflow");
const constraintsInput = $("#constraints");
const successInput = $("#success");
const transcript = $("#transcript");
const empty = $("#empty-state");
const run = $("#run");
const modeButton = $("#mode-toggle");
const clear = $("#clear");
const exportButton = $("#export");
const status = $("#status");
const model = $("#model");
const confidence = $("#consensus");
const confidenceFill = $("#consensus-fill");
const count = $("#count");
const formStatus = $("#form-status");
const STORAGE = "material-ai-v2";
const LEGACY_STORAGE = "material-ai-v1";

const ENGINE_ORDER = ["local", "claude", "mistral"];
const LOCAL_ENGINE = {available: true, label: "Local engine"};
let engines = {local: LOCAL_ENGINE};
let engine = "local";
let session = loadSession();

function availableEngines() {
  return ENGINE_ORDER.filter(name => engines[name]?.available);
}

function parseStored(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function normalizeBrief(entry) {
  const turns = Array.isArray(entry.turns) ? entry.turns : [];
  const ariFinal = [...turns].reverse().find(turn => turn.agent === "ari")?.text || "No recommendation recorded.";
  const mike = turns.find(turn => turn.agent === "mike")?.text || "No objection recorded.";
  const brief = entry.brief && typeof entry.brief === "object" ? entry.brief : {};
  const assumptions = Array.isArray(brief.assumptions)
    ? brief.assumptions.filter(item => typeof item === "string" && item.trim()).slice(0, 4)
    : [];

  return {
    recommendation: brief.recommendation || ariFinal,
    strongest_objection: brief.strongest_objection || mike,
    assumptions: assumptions.length ? assumptions : ["This is a first-pass recommendation based only on the supplied prompt."],
    next_action: brief.next_action || "Assign one owner and define the condition for reviewing this decision."
  };
}

function normalizeEntry(entry = {}) {
  const decisionInput = normalizeDecisionInput(entry);
  const prompt = typeof entry.prompt === "string" ? entry.prompt : "Untitled decision";
  const rawConfidence = Number(entry.confidence ?? entry.consensus);
  const safeConfidence = Number.isFinite(rawConfidence)
    ? Math.max(0, Math.min(100, Math.round(rawConfidence)))
    : calculateConfidence(prompt, decisionInput);

  return {
    prompt,
    workflow: decisionInput.workflow,
    constraints: decisionInput.constraints,
    success: decisionInput.success,
    model: typeof entry.model === "string" ? entry.model : "Material deterministic engine v2",
    confidence: safeConfidence,
    turns: Array.isArray(entry.turns) ? entry.turns : [],
    brief: normalizeBrief(entry),
    created_at: entry.created_at || new Date().toISOString()
  };
}

function loadSession() {
  const current = parseStored(STORAGE);
  const legacy = parseStored(LEGACY_STORAGE);
  const source = current?.entries ? current : legacy?.entries ? legacy : {entries: []};
  return {entries: source.entries.map(normalizeEntry).slice(-12)};
}

function save() {
  localStorage.setItem(STORAGE, JSON.stringify(session));
}

function setNotice(message = "", kind = "") {
  formStatus.textContent = message;
  formStatus.dataset.kind = kind;
}

function setMode() {
  if (!engines[engine]?.available) engine = "local";
  const list = availableEngines();
  modeButton.textContent = engines[engine].label;
  modeButton.setAttribute("aria-pressed", String(engine !== "local"));
  modeButton.title = list.length > 1
    ? `Switch engine: ${list.map(name => engines[name].label).join(" → ")}`
    : "Local engine only — run a local Mistral or set ANTHROPIC_API_KEY on the Node server";
  status.textContent = engine === "local" ? "local engine ready" : `${engines[engine].label.toLowerCase()} ready`;
}

function textNode(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

function renderQuery(entry, entryIndex) {
  const query = document.createElement("div");
  query.className = "query";

  const meta = document.createElement("div");
  meta.className = "query-meta";
  meta.append(
    textNode("span", "", `QUERY ${String(entryIndex + 1).padStart(2, "0")}`),
    textNode("span", "", workflows[entry.workflow].label.toUpperCase())
  );
  query.append(meta, textNode("p", "", entry.prompt));

  if (entry.constraints || entry.success) {
    const context = document.createElement("dl");
    context.className = "query-context";
    if (entry.constraints) {
      const group = document.createElement("div");
      group.append(textNode("dt", "", "Constraints"), textNode("dd", "", entry.constraints));
      context.append(group);
    }
    if (entry.success) {
      const group = document.createElement("div");
      group.append(textNode("dt", "", "Success"), textNode("dd", "", entry.success));
      context.append(group);
    }
    query.append(context);
  }

  return query;
}

function renderTurn(turn, index) {
  const node = document.createElement("article");
  node.className = `turn ${turn.agent === "mike" ? "mike" : "ari"}`;
  node.style.setProperty("--delay", `${index * 90}ms`);

  const identity = document.createElement("div");
  identity.append(
    textNode("b", "", turn.agent === "mike" ? "♞" : "♘"),
    textNode("span", "", turn.label || (turn.agent === "mike" ? "MIKE" : "ARI"))
  );
  node.append(identity, textNode("p", "", turn.text || ""));
  return node;
}

function renderBrief(entry, entryIndex) {
  const card = document.createElement("section");
  card.className = "decision-brief";

  const head = document.createElement("header");
  const title = document.createElement("div");
  title.append(
    textNode("p", "eyebrow", `DECISION BRIEF / ${workflows[entry.workflow].label.toUpperCase()}`),
    textNode("h3", "", "The usable answer")
  );

  const actions = document.createElement("div");
  actions.className = "brief-actions";
  actions.append(textNode("b", "confidence-badge", `${entry.confidence}% confidence`));
  const copyButton = textNode("button", "copy-brief", "Copy brief");
  copyButton.type = "button";
  copyButton.dataset.copyEntry = String(entryIndex);
  actions.append(copyButton);
  head.append(title, actions);

  const grid = document.createElement("div");
  grid.className = "brief-grid";

  const fields = [
    ["Recommendation", entry.brief.recommendation, "wide"],
    ["Strongest objection", entry.brief.strongest_objection, ""],
    ["Next action", entry.brief.next_action, "next"]
  ];

  fields.forEach(([label, value, className]) => {
    const field = document.createElement("article");
    field.className = className;
    field.append(textNode("small", "", label), textNode("p", "", value));
    grid.append(field);
  });

  const assumptions = document.createElement("article");
  assumptions.className = "assumptions";
  assumptions.append(textNode("small", "", "Assumptions"));
  const list = document.createElement("ul");
  entry.brief.assumptions.forEach(item => list.append(textNode("li", "", item)));
  assumptions.append(list);
  grid.append(assumptions);

  card.append(head, grid);
  return card;
}

function render() {
  transcript.querySelectorAll(".entry").forEach(node => node.remove());
  empty.hidden = session.entries.length > 0;

  session.entries.forEach((entry, entryIndex) => {
    const wrap = document.createElement("section");
    wrap.className = "entry";
    wrap.append(renderQuery(entry, entryIndex));
    entry.turns.forEach((turn, index) => wrap.append(renderTurn(turn, index)));
    wrap.append(renderBrief(entry, entryIndex));
    transcript.append(wrap);
  });

  count.textContent = String(session.entries.length);
  const latest = session.entries.at(-1);
  const value = latest?.confidence || 0;
  confidence.textContent = `${value}%`;
  confidenceFill.style.width = `${value}%`;
  model.textContent = latest?.model || "Material deterministic engine v2";
  clear.disabled = session.entries.length === 0;
  exportButton.disabled = session.entries.length === 0;
  transcript.scrollTop = transcript.scrollHeight;
}

async function checkApi() {
  try {
    const response = await fetch("./api/status", {cache: "no-store"});
    if (!response.ok) throw new Error("API unavailable");
    const data = await response.json();
    engines = {local: LOCAL_ENGINE, ...(data.providers || {})};
    engines.local = engines.local?.available ? engines.local : LOCAL_ENGINE;
    // Prefer a real model when one is reachable, otherwise stay local.
    engine = availableEngines().find(name => name !== "local") || "local";
  } catch {
    engines = {local: LOCAL_ENGINE};
    engine = "local";
  }
  setMode();
}

function decisionAsMarkdown(entry, entryIndex) {
  const assumptions = entry.brief.assumptions.map(item => `- ${item}`).join("\n");
  return `# Material.ai decision ${entryIndex + 1}\n\n**Prompt:** ${entry.prompt}\n\n**Mode:** ${workflows[entry.workflow].label}\n\n**Confidence:** ${entry.confidence}%\n\n## Recommendation\n\n${entry.brief.recommendation}\n\n## Strongest objection\n\n${entry.brief.strongest_objection}\n\n## Assumptions\n\n${assumptions}\n\n## Next action\n\n${entry.brief.next_action}`;
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const helper = document.createElement("textarea");
  helper.value = value;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.append(helper);
  helper.select();
  document.execCommand("copy");
  helper.remove();
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const prompt = input.value.trim();
  if (!prompt) return;

  const decisionInput = normalizeDecisionInput({
    workflow: workflowInput.value,
    constraints: constraintsInput.value,
    success: successInput.value
  });

  run.disabled = true;
  run.textContent = "Thinking…";
  setNotice();

  try {
    let result;
    if (engine !== "local") {
      const label = engines[engine].label;
      try {
        const response = await fetch("./api/debate", {
          method: "POST",
          headers: {"content-type": "application/json"},
          body: JSON.stringify({prompt, provider: engine, ...decisionInput})
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `${label} request failed.`);
        result = data;
        // The server answers with the local engine rather than an error when
        // the model call fails, so surface that instead of silently showing it.
        if (data.fallback) {
          engine = "local";
          setMode();
          setNotice(`${label} was unavailable, so this decision used the deterministic local engine.`, "warning");
        }
      } catch {
        engine = "local";
        setMode();
        result = simulateDemoDebate(prompt, decisionInput);
        setNotice(`${label} was unavailable, so this decision used the deterministic local engine.`, "warning");
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 320));
      result = simulateDemoDebate(prompt, decisionInput);
    }

    const entry = normalizeEntry({
      prompt,
      ...decisionInput,
      ...result,
      created_at: new Date().toISOString()
    });
    session.entries.push(entry);
    session.entries = session.entries.slice(-12);
    save();
    render();
    input.value = "";
  } catch (error) {
    setNotice(error.message || "The decision could not be generated.", "error");
  } finally {
    run.disabled = false;
    run.textContent = "Run debate";
    input.focus();
  }
});

modeButton.addEventListener("click", () => {
  const list = availableEngines();
  if (list.length < 2) {
    setNotice("Only the local engine is available. Start a local Mistral, or set ANTHROPIC_API_KEY on the Node server.", "warning");
    return;
  }
  engine = list[(list.indexOf(engine) + 1) % list.length];
  setMode();
  setNotice();
});

clear.addEventListener("click", () => {
  session = {entries: []};
  save();
  render();
  setNotice("Session cleared.");
});

exportButton.addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(session, null, 2)], {type: "application/json"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = `material-ai-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

transcript.addEventListener("click", async event => {
  const button = event.target.closest("[data-copy-entry]");
  if (!button) return;
  const entryIndex = Number(button.dataset.copyEntry);
  const entry = session.entries[entryIndex];
  if (!entry) return;

  const original = button.textContent;
  try {
    await copyText(decisionAsMarkdown(entry, entryIndex));
    button.textContent = "Copied";
  } catch {
    button.textContent = "Copy failed";
  }
  window.setTimeout(() => {
    button.textContent = original;
  }, 1400);
});

render();
checkApi();
