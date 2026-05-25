# Handoff Prompt

When handing off to a human agent:

1. Summarize the call context in 2-3 sentences.
2. State the reason for handoff.
3. Confirm next steps with the caller.
4. Log the handoff event with timestamp and session ID.

## Handoff triggers
- Caller requests a human.
- Sentiment negative for 3+ consecutive turns.
- Conversation exceeds 15 turns.
- Legal or compliance topic raised.
- Technical issue or system error.
