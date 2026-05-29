/**
 * Example: Launch an outbound call via Retell
 * Run: npx tsx examples/retell-outbound-call.ts
 * Requires: RETELL_API_KEY, RETELL_AGENT_ID in .env
 */

import { config } from 'dotenv';
import { createRetellCall } from '../src/orchestration/retell.js';

config();

const agentId = process.env.RETELL_AGENT_ID;
if (!agentId) throw new Error('RETELL_AGENT_ID is required');

const call = await createRetellCall({
  fromNumber: process.env.TWILIO_PHONE_NUMBER ?? '+34600000000',
  toNumber:   '+34611111111', // replace with real number
  agentId,
  retellLlmDynamicVariables: {
    contact_name: 'Carlos',
    campaign:     'outbound-q2-2026',
  },
});

console.log('Call created:', call.call_id);
