# Material.ai

Material.ai is a dual-agent decision lab built around two complementary reasoning systems represented as black and white chess knights:

- **Ari — White Knight:** strategic synthesis, planning, and pattern recognition.
- **Mike — Black Knight:** adversarial review, counterarguments, and premise testing.

Every prompt becomes a three-move exchange: Ari proposes, Mike challenges, and Ari makes the final move. V2 turns that exchange into a structured decision brief that can be copied, archived, or used as the next step in a real project.

## What it produces

Each run returns:

- a clear recommendation
- the strongest objection
- explicit assumptions
- one concrete next action
- a confidence score based on supplied context, not random certainty

## Work modes

- **Decide** — choose a direction and name the tradeoff
- **Stress-test** — try to break a plan before committing
- **Plan** — turn an idea into an ordered first move
- **Compare** — evaluate complete options against shared criteria

Optional constraints and success criteria improve both the debate and the confidence calculation.

## Features

- Responsive monochrome chessboard interface
- Deterministic local simulation with no dependencies or API key
- Optional live Claude orchestration through a server-side Anthropic Messages API proxy
- Shared response contract across Claude and demo modes
- Automatic fallback from Claude mode to demo mode
- V1 local-session migration, V2 persistence, Markdown copy, and JSON export
- Node tests, GitHub Actions CI, and GitHub Pages deployment
- Server-side request limits, prompt-injection boundaries, and a restrictive Content Security Policy

## Run locally

Requires Node.js 20 or newer.

```bash
git clone https://github.com/coobytron/Material.ai.git
cd Material.ai
npm install
npm test
npm start
```

Open `http://127.0.0.1:3000`.

## Enable Claude mode

```bash
export ANTHROPIC_API_KEY="your-key"
export ANTHROPIC_MODEL="claude-sonnet-4-6"
npm start
```

The API key remains on the Node server. `ANTHROPIC_MODEL` is configurable so model changes do not require source edits.

## Static demo

```bash
python3 -m http.server 8080 --directory public
```

The same `public/` folder is deployed to GitHub Pages when changes reach `main`. Static mode uses the deterministic engine and does not need a model provider.

## API contract

`POST /api/debate`

```json
{
  "prompt": "Should we build this?",
  "workflow": "stress-test",
  "constraints": "Two weeks, no new dependencies",
  "success": "Five users complete the workflow"
}
```

Successful responses include `turns`, `confidence`, and a `brief` containing `recommendation`, `strongest_objection`, `assumptions`, and `next_action`.

## Architecture

```text
public/index.html     semantic interface and decision inputs
public/styles.css     monochrome responsive design
public/app.js         state migration, rendering, copy/export, API fallback
public/engine.js      deterministic workflows and decision-brief engine
server.js             static server and structured Anthropic proxy
test/                 dependency-free Node tests
docs/                 project brief, decision contract, and agent record
```

## Privacy

- Credentials never enter browser code.
- Demo mode runs locally in the browser.
- Session history remains in local storage until cleared.
- Copy and export are user-initiated.
- Prompt, constraints, request body size, and success-criteria lengths are limited server-side.
- The application does not ingest or train on private message history.

## Agent team

The delivery model follows [`coobytron/Agent-Cody-Banks`](https://github.com/coobytron/Agent-Cody-Banks). See [`docs/PROJECT-BRIEF.md`](docs/PROJECT-BRIEF.md) and [`docs/DECISION-BRIEF.md`](docs/DECISION-BRIEF.md).
