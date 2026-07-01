/**
 * Retell AI Orchestration Integration
 * Docs: https://docs.retellai.com
 * Auth: Authorization: Bearer RETELL_API_KEY
 * Base: https://api.retellai.com
 * Note: webhook must respond 2xx within 10 seconds
 */

import crypto from 'crypto';
import { logger } from '../analytics/logger.js';

const BASE = 'https://api.retellai.com';

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.RETELL_API_KEY ?? ''}`,
  };
}

async function retellPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Retell POST ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function retellGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`Retell GET ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RetellOutboundCall {
  fromNumber: string;    // E.164, must be registered in Retell
  toNumber:   string;    // E.164
  agentId:    string;
  metadata?:  Record<string, string>;
  retellLlmDynamicVariables?: Record<string, string>;
}

export interface RetellWebhookEvent {
  event:   'call_started' | 'call_ended' | 'call_analyzed';
  call_id: string;
  agent_id?: string;
  call?: {
    call_id:         string;
    call_status:     string;
    start_timestamp?: number;
    end_timestamp?:   number;
    duration_ms?:     number;
    from_number:      string;
    to_number:        string;
    transcript?:      string;
    transcript_object?: Array<{ role: string; content: string }>;
    call_analysis?: {
      call_summary?:     string;
      user_sentiment?:   string;
      call_successful?:  boolean;
      custom_analysis_data?: Record<string, unknown>;
    };
  };
}

// ── 1. Create outbound call ──────────────────────────────────────────────────

export async function createRetellCall(
  params: RetellOutboundCall
): Promise<{ call_id: string }> {
  const body: Record<string, unknown> = {
    from_number: params.fromNumber,
    to_number:   params.toNumber,
    agent_id:    params.agentId,
  };
  if (params.metadata)                    body.metadata = params.metadata;
  if (params.retellLlmDynamicVariables)   body.retell_llm_dynamic_variables = params.retellLlmDynamicVariables;

  const data = await retellPost('/v2/create-phone-call', body) as { call_id: string };
  logger.info({ callId: data.call_id }, '[retell] Call created');
  return data;
}

// ── 2. Get call details ──────────────────────────────────────────────────────

export async function getRetellCall(callId: string): Promise<unknown> {
  return retellGet(`/v2/get-call/${callId}`);
}

// ── 3. Verify webhook signature ───────────────────────────────────────────────

export function verifyRetellSignature(
  rawBody: string,
  signature: string
): boolean {
  const apiKey = process.env.RETELL_API_KEY ?? '';
  const hmac = crypto
    .createHmac('sha256', apiKey)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ── 4. Webhook event router ─────────────────────────────────────────────────────

export interface RetellEventHandlers {
  onCallStarted?:  (callId: string) => void;
  onCallEnded?:    (callId: string, durationMs: number) => void;
  onCallAnalyzed?: (callId: string, analysis: RetellWebhookEvent['call']) => void;
}

export function routeRetellEvent(
  event: RetellWebhookEvent,
  handlers: RetellEventHandlers
): void {
  const callId = event.call_id;

  switch (event.event) {
    case 'call_started':
      logger.info({ callId }, '[retell] Call started');
      handlers.onCallStarted?.(callId);
      break;

    case 'call_ended':
      {
        const dur = event.call?.duration_ms ?? 0;
        logger.info({ callId, durationMs: dur }, '[retell] Call ended');
        handlers.onCallEnded?.(callId, dur);
      }
      break;

    case 'call_analyzed':
      logger.info({ callId }, '[retell] Call analyzed');
      handlers.onCallAnalyzed?.(callId, event.call);
      break;
  }
}
