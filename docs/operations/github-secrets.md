# GitHub Secrets Setup

All secrets must be added in:
`Settings > Secrets and variables > Actions > New repository secret`

## Required secrets

| Secret | Where to get it | Used in |
|---|---|---|
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | LLM + Realtime + eval |
| `DEEPGRAM_API_KEY` | [console.deepgram.com](https://console.deepgram.com) | STT adapter |
| `ELEVENLABS_API_KEY` | [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys) | TTS adapter |
| `ELEVENLABS_VOICE_ID` | [elevenlabs.io/app/voice-library](https://elevenlabs.io/app/voice-library) | TTS adapter |
| `TWILIO_ACCOUNT_SID` | [console.twilio.com](https://console.twilio.com) | Telephony |
| `TWILIO_AUTH_TOKEN` | [console.twilio.com](https://console.twilio.com) | Telephony |
| `TWILIO_PHONE_NUMBER` | [console.twilio.com/phone-numbers](https://console.twilio.com/phone-numbers) | Outbound calls |
| `VAPI_API_KEY` | [dashboard.vapi.ai](https://dashboard.vapi.ai) | Orchestration |
| `RETELL_API_KEY` | [app.retellai.com](https://app.retellai.com) | Orchestration |
| `HUBSPOT_API_KEY` | [app.hubspot.com/private-apps](https://app.hubspot.com/private-apps) | CRM sync |
| `SALESFORCE_CLIENT_ID` | Salesforce Connected App | CRM sync |
| `SALESFORCE_CLIENT_SECRET` | Salesforce Connected App | CRM sync |
| `SALESFORCE_INSTANCE_URL` | Your Salesforce org URL | CRM sync |
| `REDIS_URL` | Your Redis provider | Session store |

## Environments

Create two environments in `Settings > Environments`:

### staging
- No protection rules.
- Add environment-specific overrides if needed.

### production
- Required reviewers: at least 1.
- Only deploy on tag `v*`.

## Webhook setup (Twilio)

1. Go to [console.twilio.com/phone-numbers](https://console.twilio.com/phone-numbers).
2. Select your number.
3. Set **A call comes in** webhook to: `https://your-domain/twilio/incoming`
4. Set **Call status changes** webhook to: `https://your-domain/twilio/status`
5. Method: `HTTP POST`.
