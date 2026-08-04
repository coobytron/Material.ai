const EMPTY_RECAP = Object.freeze({
  question: "",
  current_answer: "",
  ari_position: "",
  mike_position: "",
  agreement: [],
  open_questions: [],
  next_move: ""
});

export function cleanText(value, limit = 4000) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function cleanList(value, limit = 5) {
  return Array.isArray(value)
    ? value.map(item => cleanText(item, 320)).filter(Boolean).slice(0, limit)
    : [];
}

export function normalizeRecap(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return {
    question: cleanText(source.question, 600),
    current_answer: cleanText(source.current_answer, 1200),
    ari_position: cleanText(source.ari_position, 700),
    mike_position: cleanText(source.mike_position, 700),
    agreement: cleanList(source.agreement),
    open_questions: cleanList(source.open_questions),
    next_move: cleanText(source.next_move, 600)
  };
}

function parseJson(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function repairJson(value) {
  if (typeof value !== "string") return null;
  const withoutFences = value
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  const candidate = withoutFences
    .slice(start, end + 1)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/,\s*([}\]])/g, "$1");
  return parseJson(candidate);
}

function roleContent(parsed, role) {
  const direct = cleanText(parsed?.[role], 2400);
  if (direct) return direct;
  const turns = Array.isArray(parsed?.turns) ? parsed.turns : [];
  const turn = turns.find(item => item?.role === role || item?.agent === role);
  return cleanText(turn?.content ?? turn?.text, 2400);
}

export function parseModelPayload(raw) {
  const parsed = parseJson(raw) || repairJson(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("The model response was not valid JSON.");
  }

  const ari = roleContent(parsed, "ari");
  const mike = roleContent(parsed, "mike");
  if (!ari || !mike) {
    throw new Error("The model response must include both Ari and Mike.");
  }

  return {
    turns: [
      {role: "ari", content: ari},
      {role: "mike", content: mike}
    ],
    recap: normalizeRecap(parsed.recap)
  };
}

export function normalizeMessages(messages, limit = 80) {
  if (!Array.isArray(messages)) return [];
  return messages
    .map((message, index) => ({
      role: ["user", "ari", "mike"].includes(message?.role) ? message.role : "",
      content: cleanText(message?.content, 6000),
      created_at: cleanText(message?.created_at, 64) || new Date(index).toISOString()
    }))
    .filter(message => message.role && message.content)
    .slice(-limit);
}

export function trimMessages(messages, {budget = 12000} = {}) {
  const normalized = normalizeMessages(messages, 120);
  if (!normalized.length) {
    return {messages: [], trimmed: false, original_count: 0, context_chars: 0};
  }

  const indexed = normalized.map((message, index) => ({...message, index}));
  const firstUser = indexed.find(message => message.role === "user") || indexed[0];
  const latestUser = [...indexed].reverse().find(message => message.role === "user") || indexed.at(-1);
  const selected = new Map();
  let used = 0;

  for (const message of [firstUser, latestUser]) {
    if (!message || selected.has(message.index)) continue;
    const remaining = Math.max(240, budget - used);
    const content = message.content.slice(-remaining);
    selected.set(message.index, {...message, content});
    used += content.length;
  }

  for (let index = indexed.length - 1; index >= 0; index -= 1) {
    const message = indexed[index];
    if (selected.has(message.index)) continue;
    const remaining = budget - used;
    if (remaining < 240) break;
    const content = message.content.length <= remaining
      ? message.content
      : message.content.slice(-remaining);
    selected.set(message.index, {...message, content});
    used += content.length;
  }

  const output = [...selected.values()]
    .sort((a, b) => a.index - b.index)
    .map(({index, ...message}) => message);

  return {
    messages: output,
    trimmed: output.length < normalized.length || output.some(message => {
      const original = normalized.find(item => item.created_at === message.created_at && item.role === message.role);
      return original ? original.content.length !== message.content.length : false;
    }),
    original_count: normalized.length,
    context_chars: output.reduce((sum, message) => sum + message.content.length, 0)
  };
}

export function createConversation({id, now = new Date().toISOString(), title = "New chat"} = {}) {
  const conversationId = cleanText(id, 120) || `chat-${Date.now().toString(36)}`;
  return {
    id: conversationId,
    title: cleanText(title, 80) || "New chat",
    created_at: now,
    updated_at: now,
    model: "",
    messages: [],
    recap: {...EMPTY_RECAP}
  };
}

export function normalizeConversation(value = {}) {
  const conversation = createConversation({
    id: value.id,
    now: cleanText(value.created_at, 64) || new Date().toISOString(),
    title: value.title
  });
  conversation.updated_at = cleanText(value.updated_at, 64) || conversation.created_at;
  conversation.model = cleanText(value.model, 160);
  conversation.messages = normalizeMessages(value.messages);
  conversation.recap = normalizeRecap(value.recap);
  return conversation;
}

export function normalizeStore(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const conversations = Array.isArray(source.conversations)
    ? source.conversations.map(normalizeConversation).filter(item => item.id).slice(-30)
    : [];
  const unique = conversations.filter((item, index, all) => all.findIndex(other => other.id === item.id) === index);
  const requested = cleanText(source.active_id, 120);
  return {
    active_id: unique.some(item => item.id === requested) ? requested : unique.at(-1)?.id || "",
    conversations: unique
  };
}

export function messagePresentation(role) {
  const presentations = {
    user: {label: "You", icon: "YOU", className: "user"},
    ari: {label: "Ari", icon: "♘", className: "ari"},
    mike: {label: "Mike", icon: "♞", className: "mike"}
  };
  return presentations[role] || presentations.user;
}

export function titleFromMessage(content) {
  const clean = cleanText(content, 80).replace(/\s+/g, " ");
  return clean.length > 54 ? `${clean.slice(0, 53)}…` : clean || "New chat";
}

export function recapAsMarkdown(recap, title = "Material.ai recap") {
  const item = normalizeRecap(recap);
  const list = values => values.length ? values.map(value => `- ${value}`).join("\n") : "- None recorded";
  return `# ${title}\n\n## Question\n\n${item.question || "Not recorded"}\n\n## Current answer\n\n${item.current_answer || "Not recorded"}\n\n## Ari\n\n${item.ari_position || "Not recorded"}\n\n## Mike\n\n${item.mike_position || "Not recorded"}\n\n## Agreement\n\n${list(item.agreement)}\n\n## Open questions\n\n${list(item.open_questions)}\n\n## Next move\n\n${item.next_move || "Not recorded"}`;
}

export function conversationAsMarkdown(conversation) {
  const item = normalizeConversation(conversation);
  const transcript = item.messages.map(message => {
    const presentation = messagePresentation(message.role);
    return `## ${presentation.label}\n\n${message.content}`;
  }).join("\n\n");
  return `# ${item.title}\n\n${transcript}\n\n---\n\n${recapAsMarkdown(item.recap, "Living recap")}`;
}
