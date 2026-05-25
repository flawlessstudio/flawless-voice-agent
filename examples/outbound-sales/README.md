# Example: Outbound Sales Qualification

## Use case
Automatic outbound qualification of inbound leads within 5 minutes of form submission.

## Path
Fast path → HubSpot sync → SDR notification if qualified.

## Stack
- Twilio outbound call
- Deepgram STT
- OpenAI Realtime
- ElevenLabs TTS
- Vapi orchestration
- HubSpot CRM sync

## Flow
1. Lead submits form.
2. Webhook triggers outbound call.
3. Agent qualifies using BANT.
4. If qualified: update HubSpot, notify SDR.
5. If not qualified: log reason, add to nurture.
