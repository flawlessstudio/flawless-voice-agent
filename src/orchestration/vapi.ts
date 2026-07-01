/**
 * Vapi Orchestration Integration
 * Docs: https://docs.vapi.ai
 * Auth: Authorization: Bearer VAPI_API_KEY
 * Base: https://api.vapi.ai
 */

import { logger } from '../analytics/logger.js';

const BASE = 'https://api.vapi.ai';

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.VAPI_API_KEY ?? ''}`,
  };
}

async function vapiPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Vapi POST ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function vapiGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`Vapi GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function vapiPatch(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Vapi PATCH ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VapiOutboundCall {
  phoneNumberId: string;   // imported Twilio number ID in Vapi
  toNumber:      string;   // destination E.164
  assistantId?:  string;   // pre-created assistant ID
  assistant?:    Record<string, unknown>; // inline assistant config
  metadata?:     Record<string, string>;
}

export interface VapiWebhookEvent {
  type:    string;
  call?:   { id: string; status: string; phoneNumberId: string };
  message?: Record<string, unknown>;
  transcript?: string;
  functionCall?: { name: string; parameters: Record<string, unknown> };
  endedReason?: string;
  artifact?: {
    transcript: string;
    recordingUrl?: string;
    summary?: string;
  };
}

// ── 1. Create outbound call ──────────────────────────────────────────────────

export async function createVapiCall(params: VapiOutboundCall): Promise<{ id: string }> {
  const body: Record<string, unknown> = {
    phoneNumberId: params.phoneNumberId,
    customer: { number: params.toNumber },
  };
  if (params.assistantId) body.assistantId = params.assistantId;
  if (params.assistant)   body.assistant   = params.assistant;
  if (params.metadata)    body.metadata     = params.metadata;

  const data = await vapiPost('/call', body) as { id: string };
  logger.info({ callId: data.id }, '[vapi] Call created');
  return data;
}

// ── 2. Get call details ──────────────────────────────────────────────────────

export async function getVapiCall(callId: string): Promise<unknown> {
  return vapiGet(`/call/${callId}`);
}

// ── 3. Import Twilio number into Vapi ─────────────────────────────────────────

export async function importTwilioNumber(params: {
  twilioAccountSid:  string;
  twilioAuthToken:   string;
  phoneNumber:       string;
  serverUrl?:        string;
}): Promise<{ id: string }> {
  const data = await vapiPost('/phone-number/import', {
    provider:          'twilio',
    twilioAccountSid:  params.twilioAccountSid,
    twilioAuthToken:   params.twilioAuthToken,
    number:            params.phoneNumber,
    ...(params.serverUrl ? { serverUrl: params.serverUrl } : {}),
  }) as { id: string };
  logger.info({ phoneNumberId: data.id }, '[vapi] Twilio number imported');
  return data;
}

// ── 4. Update phone number server URL ──────────────────────────────────────

export async function updatePhoneNumberServer(
  phoneNumberId: string,
  serverUrl: string
): Promise<void> {
  await vapiPatch(`/phone-number/${phoneNumberId}`, { serverUrl });
  logger.info({ phoneNumberId }, '[vapi] Phone number server URL updated');
}

// ── 5. Webhook event router ─────────────────────────────────────────────────────

export interface VapiEventHandlers {
  onCallStarted?:   (callId: string) => void;
  onCallEnded?:     (callId: string, reason: string) => void;
  onTranscript?:    (callId: string, text: string) => void;
  onFunctionCall?:  (callId: string, name: string, params: Record<string, unknown>) => Promise<unknown>;
  onEndOfCallReport?: (callId: string, artifact: VapiWebhookEvent['artifact']) => void;
}

export function routeVapiEvent(
  event: VapiWebhookEvent,
  handlers: VapiEventHandlers
): unknown {
  const callId = event.call?.id ?? 'unknown';

  switch (event.type) {
    case 'call.started':
    case 'call-started':
      logger.info({ callId }, '[vapi] Call started');
      handlers.onCallStarted?.(callId);
      break;

    case 'call.ended':
    case 'call-ended':
      logger.info({ callId, reason: event.endedReason }, '[vapi] Call ended');
      handlers.onCallEnded?.(callId, event.endedReason ?? 'unknown');
      break;

    case 'transcript':
      if (event.transcript) handlers.onTranscript?.(callId, event.transcript);
      break;

    case 'function-call':
      if (event.functionCall && handlers.onFunctionCall) {
        return handlers.onFunctionCall(
          callId,
          event.functionCall.name,
          event.functionCall.parameters
        );
      }
      break;

    case 'end-of-call-report':
      logger.info({ callId }, '[vapi] End-of-call report');
      handlers.onEndOfCallReport?.(callId, event.artifact);
      break;
  }

  return null;
}
