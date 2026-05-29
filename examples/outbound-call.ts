/**
 * Example: Launch an outbound call via Vapi
 * Run: npx tsx examples/outbound-call.ts
 * Requires: VAPI_API_KEY, VAPI_PHONE_NUMBER_ID, VAPI_ASSISTANT_ID in .env
 */

import { config } from 'dotenv';
import { createVapiCall } from '../src/orchestration/vapi.js';

config();

const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
const assistantId   = process.env.VAPI_ASSISTANT_ID;

if (!phoneNumberId) throw new Error('VAPI_PHONE_NUMBER_ID is required');
if (!assistantId)   throw new Error('VAPI_ASSISTANT_ID is required');

const call = await createVapiCall({
  phoneNumberId,
  assistantId,
  toNumber: '+34600000000', // replace with real number
  metadata: {
    contactId: 'crm_contact_001',
    campaign:  'outbound-q2-2026',
  },
});

console.log('Call created:', call.id);
