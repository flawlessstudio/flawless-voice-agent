# Legal Compliance — RGPD / LOPD-GDD

> Applicable law: EU Regulation 2016/679 (GDPR) + Spanish Organic Law 3/2018 (LOPD-GDD)  
> Jurisdiction: Spain / European Union  
> Last reviewed: 2026-05-29

## 1. Legal basis for processing

Voice calls processed by this system involve **personal data** (voice, phone number, conversation content). The legal basis must be one of:

| Basis | When to use |
|---|---|
| **Consent** (Art. 6.1.a GDPR) | Outbound marketing calls — explicit opt-in required before dialling |
| **Contract** (Art. 6.1.b GDPR) | Calls necessary for contract execution (support, onboarding) |
| **Legitimate interest** (Art. 6.1.f GDPR) | B2B prospecting — requires LIA (Legitimate Interest Assessment) |

## 2. Mandatory disclosures at call start

Every call must begin with an automated disclosure if recording or AI processing is active:

> *"Esta llamada puede ser grabada y procesada por inteligencia artificial con fines de [purpose]. Puede solicitar la eliminación de sus datos contactando con [contact]"*

This is required under GDPR Art. 13 (information to be provided) and Spanish AEPD guidelines on voice AI.

## 3. Data minimisation

- Store only transcript fields necessary for the stated purpose.
- Do not store raw audio longer than needed (recommended max: 90 days).
- `summary` and `intent` fields are pseudonymised — prefer these over full transcripts for analytics.

## 4. Data subject rights

Users may exercise the following rights (respond within 30 days):

| Right | How to handle |
|---|---|
| Access (Art. 15) | Export session JSON + CRM record on request |
| Erasure (Art. 17) | Delete VoiceSession, HubSpot call, Salesforce VoiceCall, any stored recording |
| Rectification (Art. 16) | Update CRM contact data on request |
| Portability (Art. 20) | Export as JSON |
| Objection (Art. 21) | Stop all processing; add to suppression list |

## 5. Data retention

| Data type | Recommended retention | Basis |
|---|---|---|
| Full transcript | 12 months | Legitimate interest / contract |
| Summary + intent | 36 months | Analytics |
| Raw audio recording | 90 days max | Operational |
| CRM engagement record | Duration of commercial relationship | Contract |

## 6. Third-party processors (Art. 28 GDPR)

All third-party services used must have a signed DPA (Data Processing Agreement):

| Processor | DPA available | EU data residency option |
|---|---|---|
| Twilio | ✅ twilio.com/legal/data-protection-addendum | ✅ EU region |
| OpenAI | ✅ openai.com/policies/data-processing-addendum | ✅ EU endpoints available |
| Deepgram | ✅ deepgram.com/dpa | ✅ EU region (api.eu.deepgram.com) |
| ElevenLabs | ✅ elevenlabs.io/dpa | ✅ EU |
| HubSpot | ✅ legal.hubspot.com/dpa | ✅ EU |
| Salesforce | ✅ salesforce.com/content/dam/web/en_us/www/documents/data-processing-addendum.pdf | ✅ EU |
| Vapi | ⚠️ Check current DPA at vapi.ai/legal | Verify |
| Retell | ⚠️ Check current DPA at retellai.com/legal | Verify |

## 7. Security measures (Art. 32 GDPR)

- All API keys stored as environment variables, never in code.
- HMAC-SHA1/SHA256 signature validation on all webhooks.
- Non-root Docker container.
- Secrets scanning on every commit (Gitleaks).
- Access logs retained for security audits.

## 8. Breach notification

In case of a data breach involving personal data from calls:
1. Notify AEPD (Spanish DPA) within **72 hours**: aepd.es
2. Notify affected data subjects if high risk.
3. Document in the breach register.

## 9. Contact

Data Controller: Flawless Studio  
DPO contact: [Insert contact email]  
AEPD registration: [Insert if applicable]
