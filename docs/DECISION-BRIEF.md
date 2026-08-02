# Decision Brief Contract

Material.ai separates the theatrical agent exchange from the artifact a person can actually use.

## Input

```json
{
  "prompt": "The question or proposal",
  "workflow": "decide | stress-test | plan | compare",
  "constraints": "Optional hard limits or non-negotiables",
  "success": "Optional observable success criteria"
}
```

Unknown workflow values normalize to `decide`. Browser and server inputs are trimmed and length-limited.

## Output

```json
{
  "mode": "demo | claude",
  "model": "Model identifier",
  "workflow": "decide",
  "confidence": 72,
  "turns": [
    {"agent": "ari", "label": "ARI / OPENING", "text": "..."},
    {"agent": "mike", "label": "MIKE / COUNTERPOINT", "text": "..."},
    {"agent": "ari", "label": "ARI / FINAL MOVE", "text": "..."}
  ],
  "brief": {
    "recommendation": "...",
    "strongest_objection": "...",
    "assumptions": ["...", "..."],
    "next_action": "..."
  }
}
```

## Confidence

Confidence is a measure of decision readiness, not truth. In demo mode it is deterministic and increases when the user supplies constraints and an observable success criterion. In Claude mode the model returns a score under the same semantic definition, which the server clamps to `0–100`.

## Failure behavior

- Empty prompts are rejected.
- Request bodies and text fields are length-limited.
- Claude is never called without a server-side API key.
- Claude structured output is parsed and normalized server-side.
- Missing Claude fields receive bounded fallbacks.
- Client request failure switches the current run to the deterministic engine and informs the user.

## Compatibility

V1 entries are migrated in the browser. Missing structured fields are inferred from the existing Ari/Mike turns so old sessions do not crash the interface.
