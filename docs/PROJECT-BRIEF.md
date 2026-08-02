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
2. Demo results are deterministic for the same input.
3. Claude mode activates only when the server has an API key.
4. Static deployment works from `public/`.
5. No secret appears in client code, local storage, or exported transcripts.
6. Automated tests validate routing, deterministic output, and turn order.
