# Consent Model

## Pre-call consent

Before any outbound call is initiated:
1. Check if contact has given prior written consent (TCPA).
2. Check DNC registry.
3. Check internal opt-out list.
4. If any check fails, do not dial.

## Runtime disclosure

At the start of every call, the agent must:
1. Identify itself by name.
2. State that the call is from [Company].
3. Disclose that the caller is an AI voice agent.
4. Offer the option to speak with a human.

## Consent capture

If consent is required for recording:
1. Ask for explicit verbal consent.
2. Log consent timestamp and session ID.
3. Stop recording if consent is denied.
