---
name: Prompt Improvement
about: Report a quality issue or suggest an improvement for an LLM prompt
title: "[PROMPT] <prompt-id> — <short description>"
labels: prompt, llm-quality
assignees: ""
---

## Prompt ID

<!-- The prompt id from prompts/meta/prompts.catalog.yaml (e.g. voice-agent-fast-v1) -->

## Current Behaviour

<!-- Describe what the prompt currently produces. Include the exact LLM output if possible. -->

## Expected Behaviour

<!-- Describe what the ideal output should look like. Be specific about tone, structure, data. -->

## Golden Call Reference

<!-- Link to the golden call in eval/golden-calls.json that demonstrates the issue, or paste the relevant JSON snippet. -->

```json
{
  "id": "gc-XXX",
  "input": {},
  "expected_output": "",
  "actual_output": ""
}
```

## Reproduction Steps

1. Set `EVAL_MODE=smoke`
2. Run `npm run eval:smoke`
3. Observe case ID `gc-XXX` fails with output: ...

## Impact

- [ ] Affects production calls
- [ ] Affects compliance layer
- [ ] Affects DNC / consent logic
- [ ] Edge case / rare scenario

## Suggested Fix

<!-- Optional: propose specific prompt changes, new constraints, or output format adjustments. -->

## Environment

- Model: <!-- e.g. gpt-4o, claude-3-5-sonnet -->
- Prompt version: <!-- e.g. v1.2.0 -->
- Date observed:
