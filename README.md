# Material.ai

Material.ai is a dual-agent decision lab built around two complementary reasoning systems represented as black and white chess knights:

- **Ari — White Knight:** strategic synthesis, planning, and pattern recognition.
- **Mike — Black Knight:** adversarial review, counterarguments, and premise testing.

Every prompt becomes a three-move exchange: Ari proposes, Mike challenges, and Ari makes the final move.

## Features

- Runs entirely offline: no API key, no account, no network, no dependencies
- Local engine that reads the prompt and builds the debate from its structure
- Responsive monochrome chessboard interface
- Optional live Claude orchestration through a server-side Anthropic Messages API proxy
- Automatic fallback from Claude mode to the local engine
- Local session persistence and JSON transcript export
- Node tests, GitHub Actions CI, and GitHub Pages deployment
- Server-side request limits and a restrictive Content Security Policy

## Run locally

Requires Node.js 20 or newer. Nothing else.

```bash
git clone https://github.com/coobytron/Material.ai.git
cd Material.ai
npm test
npm start
```

Open `http://127.0.0.1:3000`. There is no install step because there are no
dependencies, and no key is required — the local engine answers every prompt.

## How the local engine works

The engine in `public/engine.js` is not a canned response list. For each prompt
it extracts the decision structure, then composes the exchange from what it
found:

- **Question kind** — a choice between options, a yes/no, a how-to, a timing
  question, or an open statement.
- **Options** — `"ship Friday or wait two weeks"` becomes two named paths that
  both agents argue about by name.
- **Signals** — money, deadlines, shared ownership, reversibility, and risk,
  each pulled from the wording of the question.

Ari picks an angle (structure, cost, or evidence) and Mike rebuts *that angle
specifically* rather than answering in general. Consensus is derived from how
far apart the two positions land: concrete constraints and reversible stakes
raise it, irreversible or open-ended questions lower it.

The same prompt always produces the same debate; different prompts do not.

## Optional: enable Claude mode

```bash
npm install @anthropic-ai/sdk
export ANTHROPIC_API_KEY="your-key"
export ANTHROPIC_MODEL="claude-sonnet-4-6"
npm start
```

The API key remains on the Node server. `ANTHROPIC_MODEL` is configurable so
model changes do not require source edits. If the SDK is missing, the key is
absent, or a request fails, the server serves the local engine instead of an
error.

## Static, serverless deployment

The engine runs in the browser, so `public/` is a complete working app with no
backend at all:

```bash
python3 -m http.server 8080 --directory public
```

The same folder is deployed to GitHub Pages when changes reach `main`.

## Architecture

```text
public/index.html     semantic interface
public/styles.css     monochrome responsive design
public/app.js         state, persistence, export, Claude fallback
public/engine.js      local Ari/Mike engine (no dependencies, runs anywhere)
server.js             static server, local engine, optional Anthropic proxy
test/                 dependency-free Node tests
docs/                 project brief and agent record
```

## Privacy

- No credentials are required to use the app at all.
- Credentials never enter browser code.
- Local mode runs entirely in the browser and sends nothing anywhere.
- Session history remains in local storage until cleared.
- Transcript export is user-initiated.
- Prompt length and request body size are limited server-side.

## Agent team

The delivery model follows [`coobytron/Agent-Cody-Banks`](https://github.com/coobytron/Agent-Cody-Banks). See [`docs/PROJECT-BRIEF.md`](docs/PROJECT-BRIEF.md).
