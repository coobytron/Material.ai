# Material.ai Project Brief

## Goal

Create a production-quality dual-agent interface that turns a prompt into a structured exchange between two complementary reasoning systems represented as black and white chess knights.

## Agents

- **Ari / White Knight** — strategic synthesis, planning, context, and final recommendation.
- **Mike / Black Knight** — adversarial review, hidden assumptions, counterarguments, and risk.
- **Ari / Final move** — incorporates valid criticism and returns one concrete next action.

## Agent Cody Banks team

Producer, Creative Director, Designer, HTML Specialist, JavaScript Specialist, AI Specialist, Architect, accessibility reviewer, deterministic QA reviewer, privacy reviewer, and performance reviewer.

## Acceptance criteria

1. A prompt produces an Ari → Mike → Ari debate.
2. The app is fully usable with no API key, no network, and no dependencies.
3. Local results are derived from the prompt's own structure — question kind,
   named options, and constraint signals — not from a fixed response list.
4. Local results are deterministic for the same input.
5. Claude mode is opt-in, activates only when the server has an API key and the
   optional SDK installed, and degrades to the local engine rather than failing.
6. Static deployment works from `public/` with no backend.
7. No secret appears in client code, local storage, or exported transcripts.
8. Automated tests validate prompt analysis, deterministic output, and turn order.
