# Material.ai

Material.ai is a persistent local conversation between two complementary agents represented as black and white chess knights:

- **Ari — White Knight:** answers the question, finds structure, and recommends a direction.
- **Mike — Black Knight:** responds to Ari’s specific claim, exposes the missing tradeoff, and offers a correction or alternative.

After every user turn, one local Ollama generation returns Ari, Mike, and a neutral living recap. The conversation remains open for follow-ups instead of ending as a one-shot debate.

## Current behavior

- Chronological **You → Ari → Mike** conversation
- Multiple persistent chat threads in browser storage
- Living recap with the current answer, both positions, agreement, open questions, and next move
- One Ollama request per user turn for faster local inference
- Context trimming that preserves the original question, latest exchanges, and prior recap
- Strict JSON parsing with one repair attempt and recoverable errors
- Explicit deterministic demo mode; live failures never silently replace model output
- New chat, clear current chat, copy recap, and Markdown export
- No automatic model downloads

## Run locally

Requires Node.js 20 or newer and a locally running Ollama server.

```bash
git clone https://github.com/coobytron/Material.ai.git
cd Material.ai
npm test
npm start
```

Open `http://127.0.0.1:3000`.

Material.ai checks Ollama at `http://127.0.0.1:11434` and defaults to `mistral-small3.1` when an installed tag with that base name is available.

Optional configuration:

```bash
export OLLAMA_URL="http://127.0.0.1:11434"
export OLLAMA_MODEL="mistral-small3.1"
export MATERIAL_CONTEXT_CHARS="14000"
npm start
```

A missing model returns the locally installed model list. Material.ai does not call `ollama pull` or otherwise initiate a download.

## Static demo

```bash
python3 -m http.server 8080 --directory public
```

The static GitHub Pages version uses the explicit deterministic demo engine because it cannot reach a local Ollama process through the Node proxy.

## Chat API

`POST /api/chat`

```json
{
  "conversation_id": "chat-id",
  "model": "mistral-small3.1",
  "messages": [
    {"role": "user", "content": "What is the upside to painting versus Photoshop?"},
    {"role": "ari", "content": "..."},
    {"role": "mike", "content": "..."},
    {"role": "user", "content": "I care more about developing taste than speed."}
  ],
  "recap": {
    "question": "What is the upside to painting versus Photoshop?",
    "current_answer": "..."
  }
}
```

Response:

```json
{
  "model": "mistral-small3.1:latest",
  "turns": [
    {"role": "ari", "content": "..."},
    {"role": "mike", "content": "..."}
  ],
  "recap": {
    "question": "...",
    "current_answer": "...",
    "ari_position": "...",
    "mike_position": "...",
    "agreement": ["..."],
    "open_questions": ["..."],
    "next_move": "..."
  },
  "usage": {
    "context_messages": 7,
    "original_messages": 10,
    "context_chars": 8200,
    "trimmed": true
  }
}
```

## Architecture

```text
public/index.html       persistent chat and living recap interface
public/styles.css       core monochrome chess system
public/v2.css           responsive conversation layout
public/app.js           thread persistence, rendering, model calls, copy/export
public/chat-core.js     parser, context trimming, store normalization, exports
public/engine.js        explicit deterministic demo engine
server.js               local static server and Ollama chat proxy
test/                   dependency-free Node tests
```

## Privacy and failure behavior

- The Node server binds to `127.0.0.1`.
- Ollama requests remain local by default.
- Conversation history stays in browser local storage until cleared.
- Existing `material-ai-v2` decision data is not modified or deleted.
- Missing Ollama, missing models, timeouts, and malformed JSON return actionable errors.
- A failed turn leaves the conversation intact.

## Agent team

This implementation follows [`coobytron/Agent-Cody-Banks`](https://github.com/coobytron/Agent-Cody-Banks): Producer, Product Designer, Writer, AI Specialist, Architect, JavaScript Specialist, and Designer.
