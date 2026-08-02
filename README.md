# Material.ai

Material.ai is a dual-agent decision lab built around two complementary reasoning systems represented as black and white chess knights:

- **Ari — White Knight:** strategic synthesis, planning, and pattern recognition.
- **Mike — Black Knight:** adversarial review, counterarguments, and premise testing.

Every prompt becomes a three-move exchange: Ari proposes, Mike challenges, and Ari makes the final move.

## Features

- Responsive monochrome chessboard interface
- Deterministic local simulation with no dependencies or API key
- Optional live Claude orchestration through a server-side Anthropic Messages API proxy
- Automatic fallback from Claude mode to demo mode
- Local session persistence and JSON transcript export
- Node tests, GitHub Actions CI, and GitHub Pages deployment
- Server-side request limits and a restrictive Content Security Policy

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

The same `public/` folder is deployed to GitHub Pages when changes reach `main`.

## Architecture

```text
public/index.html     semantic interface
public/styles.css     monochrome responsive design
public/app.js         state, persistence, export, API fallback
public/engine.js      deterministic Ari/Mike engine
server.js             static server and Anthropic proxy
test/                 dependency-free Node tests
docs/                 project brief and agent record
```

## Privacy

- Credentials never enter browser code.
- Demo mode runs locally in the browser.
- Session history remains in local storage until cleared.
- Transcript export is user-initiated.
- Prompt length and request body size are limited server-side.

## Agent team

The delivery model follows [`coobytron/Agent-Cody-Banks`](https://github.com/coobytron/Agent-Cody-Banks). See [`docs/PROJECT-BRIEF.md`](docs/PROJECT-BRIEF.md).
