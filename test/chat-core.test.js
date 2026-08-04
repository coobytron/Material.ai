import test from "node:test";
import assert from "node:assert/strict";
import {
  conversationAsMarkdown,
  createConversation,
  messagePresentation,
  normalizeStore,
  parseModelPayload,
  recapAsMarkdown,
  trimMessages
} from "../public/chat-core.js";

test("model payload accepts strict JSON", () => {
  const parsed = parseModelPayload(JSON.stringify({
    ari: "Painting develops observation through physical resistance.",
    mike: "That overstates friction; Photoshop can develop taste through iteration.",
    recap: {question: "Painting or Photoshop?", agreement: ["Both can build taste."]}
  }));
  assert.deepEqual(parsed.turns.map(turn => turn.role), ["ari", "mike"]);
  assert.equal(parsed.recap.agreement[0], "Both can build taste.");
});

test("model payload performs one repair parse", () => {
  const parsed = parseModelPayload('```json\n{"ari":"A","mike":"M","recap":{"next_move":"Test both",},}\n```');
  assert.equal(parsed.turns[0].content, "A");
  assert.equal(parsed.recap.next_move, "Test both");
});

test("model payload rejects missing voices", () => {
  assert.throws(() => parseModelPayload('{"ari":"Only Ari"}'), /both Ari and Mike/i);
});

test("context trimming preserves original and latest user turns", () => {
  const messages = [];
  for (let index = 0; index < 12; index += 1) {
    messages.push({role: "user", content: `user-${index} ${"x".repeat(500)}`, created_at: `2026-08-04T10:${String(index).padStart(2, "0")}:00Z`});
    messages.push({role: index % 2 ? "mike" : "ari", content: `agent-${index} ${"y".repeat(500)}`, created_at: `2026-08-04T11:${String(index).padStart(2, "0")}:00Z`});
  }
  const result = trimMessages(messages, {budget: 2600});
  assert.equal(result.messages[0].content.startsWith("user-0"), true);
  assert.equal(result.messages.some(message => message.content.startsWith("user-11")), true);
  assert.equal(result.trimmed, true);
  assert.ok(result.context_chars <= 2600);
});

test("store normalization restores the active conversation", () => {
  const first = createConversation({id: "one", now: "2026-08-04T10:00:00Z"});
  const second = createConversation({id: "two", now: "2026-08-04T11:00:00Z"});
  second.messages.push({role: "user", content: "Follow-up five", created_at: "2026-08-04T11:01:00Z"});
  const store = normalizeStore({active_id: "two", conversations: [first, second]});
  assert.equal(store.active_id, "two");
  assert.equal(store.conversations[1].messages[0].content, "Follow-up five");
});

test("rendering contract maps each speaker", () => {
  assert.deepEqual(messagePresentation("ari"), {label: "Ari", icon: "♘", className: "ari"});
  assert.deepEqual(messagePresentation("mike"), {label: "Mike", icon: "♞", className: "mike"});
  assert.deepEqual(messagePresentation("user"), {label: "You", icon: "YOU", className: "user"});
});

test("recap and conversation exports include the living state", () => {
  const conversation = createConversation({id: "export", title: "Medium test"});
  conversation.messages = [
    {role: "user", content: "Painting or Photoshop?", created_at: "2026-08-04T10:00:00Z"},
    {role: "ari", content: "Use painting for embodied observation.", created_at: "2026-08-04T10:00:01Z"},
    {role: "mike", content: "Use Photoshop for faster iteration.", created_at: "2026-08-04T10:00:02Z"}
  ];
  conversation.recap = {question: "Painting or Photoshop?", next_move: "Make the same image twice."};
  assert.match(recapAsMarkdown(conversation.recap), /Make the same image twice/);
  assert.match(conversationAsMarkdown(conversation), /## Mike/);
});
