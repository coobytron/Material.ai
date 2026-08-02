import {calculateConsensus, simulateDemoDebate} from "./engine.js";

const $ = selector => document.querySelector(selector);
const form = $("#prompt-form");
const input = $("#prompt");
const transcript = $("#transcript");
const empty = $("#empty-state");
const run = $("#run");
const modeButton = $("#mode-toggle");
const clear = $("#clear");
const exportButton = $("#export");
const status = $("#status");
const model = $("#model");
const consensus = $("#consensus");
const consensusFill = $("#consensus-fill");
const count = $("#count");
const STORAGE = "material-ai-v1";

let claudeAvailable = false;
let liveMode = false;
let session = JSON.parse(localStorage.getItem(STORAGE) || '{"entries":[]}');

function save() {
  localStorage.setItem(STORAGE, JSON.stringify(session));
}

function setMode() {
  liveMode = claudeAvailable && liveMode;
  modeButton.textContent = liveMode ? "Claude mode" : "Demo mode";
  status.textContent = liveMode ? "live agents online" : "local agents online";
}

function render() {
  transcript.querySelectorAll(".entry").forEach(node => node.remove());
  empty.hidden = session.entries.length > 0;

  session.entries.forEach((entry, entryIndex) => {
    const wrap = document.createElement("section");
    wrap.className = "entry";
    const query = document.createElement("div");
    query.className = "query";
    query.innerHTML = `<span>QUERY ${String(entryIndex + 1).padStart(2,"0")}</span><p></p>`;
    query.querySelector("p").textContent = entry.prompt;
    wrap.append(query);

    entry.turns.forEach((turn, index) => {
      const node = document.createElement("article");
      node.className = `turn ${turn.agent}`;
      node.style.setProperty("--delay", `${index * 90}ms`);
      node.innerHTML = `<div><b>${turn.agent === "ari" ? "♘" : "♞"}</b><span></span></div><p></p>`;
      node.querySelector("span").textContent = turn.label;
      node.querySelector("p").textContent = turn.text;
      wrap.append(node);
    });
    transcript.append(wrap);
  });

  count.textContent = session.entries.length;
  const latest = session.entries.at(-1);
  const value = latest?.consensus || 0;
  consensus.textContent = `${value}%`;
  consensusFill.style.width = `${value}%`;
  model.textContent = latest?.model || "Material deterministic engine";
  clear.disabled = session.entries.length === 0;
  exportButton.disabled = session.entries.length === 0;
  transcript.scrollTop = transcript.scrollHeight;
}

async function checkApi() {
  try {
    const response = await fetch("./api/status", {cache:"no-store"});
    const data = await response.json();
    claudeAvailable = Boolean(data.claude_available);
    liveMode = claudeAvailable;
  } catch {
    claudeAvailable = false;
    liveMode = false;
  }
  setMode();
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const prompt = input.value.trim();
  if (!prompt) return;
  run.disabled = true;
  run.textContent = "Thinking…";

  try {
    let result;
    if (liveMode) {
      try {
        const response = await fetch("./api/debate", {
          method:"POST",
          headers:{"content-type":"application/json"},
          body:JSON.stringify({prompt})
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        result = data;
      } catch {
        liveMode = false;
        setMode();
        result = simulateDemoDebate(prompt);
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 450));
      result = simulateDemoDebate(prompt);
    }

    session.entries.push({
      prompt,
      model:result.model,
      consensus:result.consensus || calculateConsensus(prompt),
      turns:result.turns,
      created_at:new Date().toISOString()
    });
    session.entries = session.entries.slice(-12);
    save();
    render();
    input.value = "";
  } finally {
    run.disabled = false;
    run.textContent = "Run debate";
    input.focus();
  }
});

modeButton.addEventListener("click", () => {
  if (claudeAvailable) liveMode = !liveMode;
  setMode();
});

clear.addEventListener("click", () => {
  session = {entries:[]};
  save();
  render();
});

exportButton.addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(session,null,2)], {type:"application/json"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = `material-ai-${new Date().toISOString().slice(0,10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

render();
checkApi();
