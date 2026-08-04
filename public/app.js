import {runLocalDebate} from "./engine.js";
import {
  conversationAsMarkdown,
  createConversation,
  messagePresentation,
  normalizeRecap,
  normalizeStore,
  recapAsMarkdown,
  titleFromMessage
} from "./chat-core.js";

const $ = selector => document.querySelector(selector);
const transcript = $("#transcript");
const empty = $("#empty-state");
const form = $("#prompt-form");
const input = $("#prompt");
const send = $("#send");
const formStatus = $("#form-status");
const modeButton = $("#mode-toggle");
const status = $("#status");
const modelSelect = $("#model-select");
const count = $("#count");
const threadSelect = $("#thread-select");
const newChatButton = $("#new-chat");
const clearButton = $("#clear-chat");
const copyRecapButton = $("#copy-recap");
const exportButton = $("#export-conversation");
const recapPanel = $("#recap");
const recapQuestion = $("#recap-question");
const recapAnswer = $("#recap-answer");
const recapAri = $("#recap-ari");
const recapMike = $("#recap-mike");
const recapAgreement = $("#recap-agreement");
const recapQuestions = $("#recap-questions");
const recapNext = $("#recap-next");

const STORAGE = "material-ai-chat-v1";
const MODE_STORAGE = "material-ai-engine-v1";
let store = loadStore();
let api = {checked: false, ollama_available: false, configured_model: "mistral-small3.1", selected_model: "", models: []};
let mode = localStorage.getItem(MODE_STORAGE) === "demo" ? "demo" : "ollama";
let generating = false;

function parseStored(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadStore() {
  const normalized = normalizeStore(parseStored(STORAGE));
  if (!normalized.conversations.length) {
    const conversation = createConversation({id: makeId()});
    normalized.conversations.push(conversation);
    normalized.active_id = conversation.id;
  }
  return normalized;
}

function save() {
  localStorage.setItem(STORAGE, JSON.stringify(store));
}

function activeConversation() {
  return store.conversations.find(item => item.id === store.active_id) || store.conversations.at(-1);
}

function setNotice(message = "", kind = "") {
  formStatus.textContent = message;
  formStatus.dataset.kind = kind;
}

function textNode(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : date.toLocaleTimeString([], {hour: "numeric", minute: "2-digit"});
}

function renderThreads() {
  threadSelect.replaceChildren();
  [...store.conversations].reverse().forEach(conversation => {
    const option = document.createElement("option");
    option.value = conversation.id;
    option.textContent = conversation.title;
    option.selected = conversation.id === store.active_id;
    threadSelect.append(option);
  });
}

function renderMessages(conversation) {
  transcript.querySelectorAll(".message").forEach(node => node.remove());
  empty.hidden = conversation.messages.length > 0;

  conversation.messages.forEach(message => {
    const presentation = messagePresentation(message.role);
    const article = document.createElement("article");
    article.className = `message ${presentation.className}`;

    const head = document.createElement("header");
    head.append(
      textNode("b", "message-icon", presentation.icon),
      textNode("span", "message-name", presentation.label),
      textNode("time", "message-time", formatTime(message.created_at))
    );
    article.append(head, textNode("p", "message-content", message.content));
    transcript.append(article);
  });

  transcript.scrollTop = transcript.scrollHeight;
}

function renderList(node, values, emptyLabel) {
  node.replaceChildren();
  const items = values.length ? values : [emptyLabel];
  items.forEach(value => node.append(textNode("li", "", value)));
}

function renderRecap(conversation) {
  const recap = normalizeRecap(conversation.recap);
  recapQuestion.textContent = recap.question || "The first question will appear here.";
  recapAnswer.textContent = recap.current_answer || "The living answer updates after Ari and Mike respond.";
  recapAri.textContent = recap.ari_position || "No position yet.";
  recapMike.textContent = recap.mike_position || "No counterpoint yet.";
  recapNext.textContent = recap.next_move || "No next move yet.";
  renderList(recapAgreement, recap.agreement, "No agreement recorded yet.");
  renderList(recapQuestions, recap.open_questions, "No open questions recorded yet.");
  recapPanel.dataset.empty = String(!recap.current_answer);
}

function renderEngine() {
  const ollamaReady = api.ollama_available && api.models.length > 0;
  if (api.checked && mode === "ollama" && !ollamaReady) mode = "demo";
  localStorage.setItem(MODE_STORAGE, mode);

  modeButton.textContent = mode === "ollama" ? "Ollama mode" : "Local demo";
  modeButton.setAttribute("aria-pressed", String(mode === "ollama"));
  status.textContent = !api.checked
    ? "checking local model"
    : mode === "ollama"
      ? "local agents ready"
      : api.ollama_available ? "deterministic demo" : "demo / Ollama offline";
  modelSelect.disabled = mode !== "ollama" || !api.models.length;
}

function renderModelOptions() {
  modelSelect.replaceChildren();
  const models = api.models.length ? api.models : [api.configured_model || "mistral-small3.1"];
  models.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    modelSelect.append(option);
  });
  const preferred = api.selected_model || models[0];
  if (models.includes(preferred)) modelSelect.value = preferred;
}

function render() {
  const conversation = activeConversation();
  if (!conversation) return;
  renderThreads();
  renderMessages(conversation);
  renderRecap(conversation);
  renderEngine();
  count.textContent = String(conversation.messages.length);
  clearButton.disabled = generating || conversation.messages.length === 0;
  copyRecapButton.disabled = !conversation.recap.current_answer;
  exportButton.disabled = conversation.messages.length === 0;
  send.disabled = generating;
  threadSelect.disabled = generating;
  newChatButton.disabled = generating;
}

async function checkApi() {
  try {
    const response = await fetch("./api/status", {cache: "no-store"});
    if (!response.ok) throw new Error("API unavailable");
    api = {...api, ...(await response.json()), checked: true};
  } catch {
    api = {...api, checked: true, ollama_available: false, selected_model: "", models: []};
  }
  renderModelOptions();
  render();
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

function demoResponse(conversation) {
  const latest = [...conversation.messages].reverse().find(message => message.role === "user");
  const first = conversation.messages.find(message => message.role === "user") || latest;
  const priorUsers = conversation.messages.filter(message => message.role === "user").slice(0, -1);
  const previous = priorUsers.at(-1);
  const result = runLocalDebate(latest.content, {workflow: "decide"});
  const continuity = previous ? ` This continues your earlier point about “${previous.content.slice(0, 120)}.”` : "";
  return {
    model: "Material deterministic chat demo",
    turns: [
      {role: "ari", content: `${result.turns[0].text}${continuity}`},
      {role: "mike", content: result.turns[1].text}
    ],
    recap: {
      question: conversation.recap.question || first.content,
      current_answer: result.brief.recommendation,
      ari_position: result.turns[0].text,
      mike_position: result.turns[1].text,
      agreement: ["They agree that the next move should create evidence instead of pretending the tradeoff is settled."],
      open_questions: result.brief.assumptions.slice(0, 2),
      next_move: result.brief.next_action
    }
  };
}

async function requestResponse(conversation) {
  if (mode === "demo") {
    await new Promise(resolve => window.setTimeout(resolve, 260));
    return demoResponse(conversation);
  }

  const response = await fetch("./api/chat", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({
      conversation_id: conversation.id,
      model: modelSelect.value,
      messages: conversation.messages,
      recap: conversation.recap
    })
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    const available = Array.isArray(data.available_models) && data.available_models.length
      ? ` Available models: ${data.available_models.join(", ")}.`
      : "";
    throw new Error(`${data.error || "The local model request failed."}${available}`);
  }
  return data;
}

async function submitMessage(content) {
  const conversation = activeConversation();
  const now = new Date().toISOString();
  conversation.messages.push({role: "user", content, created_at: now});
  if (conversation.messages.filter(message => message.role === "user").length === 1) {
    conversation.title = titleFromMessage(content);
  }
  conversation.updated_at = now;
  save();

  generating = true;
  send.textContent = "Thinking…";
  setNotice("Ari + Mike are thinking…");
  render();

  try {
    const result = await requestResponse(conversation);
    const responseTime = new Date().toISOString();
    result.turns.forEach((turn, index) => {
      conversation.messages.push({
        role: turn.role,
        content: turn.content,
        created_at: new Date(Date.now() + index).toISOString()
      });
    });
    conversation.recap = normalizeRecap(result.recap);
    conversation.model = result.model || modelSelect.value;
    conversation.updated_at = responseTime;
    save();
    setNotice(result.usage?.trimmed ? "Older turns were summarized by the living recap to fit the local model context." : "");
  } catch (error) {
    setNotice(`${error.message} Your message remains saved.`, "error");
  } finally {
    generating = false;
    send.textContent = "Send";
    render();
    input.focus();
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const content = input.value.trim();
  if (!content || generating) return;
  input.value = "";
  await submitMessage(content);
});

input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    form.requestSubmit();
  }
});

modeButton.addEventListener("click", () => {
  if (!api.ollama_available || !api.models.length) {
    mode = "demo";
    setNotice(api.error || "Ollama is not available. Start it locally, then refresh the model status.", "warning");
  } else {
    mode = mode === "ollama" ? "demo" : "ollama";
    setNotice(mode === "ollama" ? "Using one local Ollama generation per user turn." : "Using the explicit deterministic demo engine.");
  }
  render();
});

threadSelect.addEventListener("change", () => {
  store.active_id = threadSelect.value;
  save();
  setNotice();
  render();
  input.focus();
});

newChatButton.addEventListener("click", () => {
  const conversation = createConversation({id: makeId()});
  store.conversations.push(conversation);
  store.conversations = store.conversations.slice(-30);
  store.active_id = conversation.id;
  save();
  setNotice("New chat started.");
  render();
  input.focus();
});

clearButton.addEventListener("click", () => {
  const conversation = activeConversation();
  conversation.title = "New chat";
  conversation.model = "";
  conversation.messages = [];
  conversation.recap = normalizeRecap();
  conversation.updated_at = new Date().toISOString();
  save();
  setNotice("Current chat cleared.");
  render();
});

copyRecapButton.addEventListener("click", async () => {
  const conversation = activeConversation();
  const original = copyRecapButton.textContent;
  try {
    await copyText(recapAsMarkdown(conversation.recap, conversation.title));
    copyRecapButton.textContent = "Copied";
  } catch {
    copyRecapButton.textContent = "Copy failed";
  }
  window.setTimeout(() => { copyRecapButton.textContent = original; }, 1400);
});

exportButton.addEventListener("click", () => {
  const conversation = activeConversation();
  const blob = new Blob([conversationAsMarkdown(conversation)], {type: "text/markdown"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `material-ai-${conversation.id}.md`;
  link.click();
  URL.revokeObjectURL(url);
});

renderModelOptions();
render();
checkApi();
