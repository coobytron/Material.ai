# Material.ai Project Brief

## Goal

Create a production-quality dual-agent interface that turns a prompt into a useful decision artifact while preserving the black-and-white chess-knight joke.

## Governing idea

Ari finds the move. Mike finds the problem with it. The product is not the debate itself; the product is the stronger decision created by visible disagreement.

## Agents

- **Ari / White Knight** — strategic synthesis, planning, context, and recommendation.
- **Mike / Black Knight** — adversarial review, hidden assumptions, counterarguments, and risk.
- **Ari / Final move** — incorporates valid criticism and returns a structured decision brief.

These are fictionalized operating profiles. Material.ai does not claim to train on or reproduce private message histories.

## Agent Cody Banks team

- Producer — scope, sequencing, delivery, and issue/PR record
- Creative Director — character tension, premise, and coherence
- Product Designer — modes, decision inputs, and reusable output
- Designer — responsive decision-board interface
- HTML Specialist — semantic controls and result structure
- JavaScript Specialist — deterministic engine, state migration, copy, and export
- AI Specialist — Claude prompts and structured output contract
- Architect — API boundary, validation, and fallback
- Writer — concise labels and decision language
- Accessibility reviewer — form semantics, status messaging, and reduced motion
- Deterministic QA reviewer — stable output and regression coverage
- Privacy reviewer — local storage, secret handling, and injection boundaries

## V2 acceptance criteria

1. A prompt produces an Ari → Mike → Ari debate.
2. Users can choose Decide, Stress-test, Plan, or Compare.
3. Users can provide optional constraints and success criteria.
4. Every successful run returns a recommendation, strongest objection, assumptions, next action, and confidence.
5. Demo results are deterministic for the full input.
6. Claude mode uses the same response contract as demo mode.
7. Invalid or unavailable Claude output falls back without losing the ability to complete the task.
8. V1 local sessions render safely in V2.
9. Static deployment works from `public/` without a model provider.
10. No secret appears in client code, local storage, copied briefs, or exported transcripts.
11. Automated tests validate routing, deterministic output, workflow normalization, confidence bounds, turn order, and complete briefs.
