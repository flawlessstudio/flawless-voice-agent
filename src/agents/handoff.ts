/**
 * handoff.ts — Multi-agent handoff
 *
 * Implements the pattern from LiveKit Agents and Vapi/Retell:
 * - Primary agent (Alex) detects handoff intent
 * - Context (session, transcript, summary so far) is passed to target
 * - Target can be: human agent (via Twilio transfer) or secondary AI agent
 *
 * Sources:
 *  - LiveKit agents: multi-agent handoff with userdata context passing
 *  - Vapi: transfer destinations with context
 *  - Retell: agent handoff via tool call
 */

import type { VoiceSessionJSON } from '../runtime/session.js';
import { tracer } from '../utils/tracer.js';

export type HandoffTarget =
  | { type: 'human';         phoneNumber: string; }
  | { type: 'sdr';           agentId: string; }
  | { type: 'support';       agentId: string; }
  | { type: 'closing';       agentId: string; };

export interface HandoffContext {
  sessionId:   string;
  callSid:     string;
  contactId?:  string;
  summaryToDate: string;
  intent:      string;
  keyFacts?:   string[];
  transcript:  { speaker: string; text: string; ts: number }[];
}

export interface HandoffResult {
  success:  boolean;
  target:   HandoffTarget;
  message?: string;
}

export async function routeHandoff(
  reason: string,
  summary: string,
  session: VoiceSessionJSON
): Promise<HandoffResult> {
  const span = tracer.startSpan({
    name:      'agent-handoff',
    sessionId: session.sessionId,
    input:     { reason, summary },
  });

  const target = resolveTarget(reason, session);

  try {
    const context: HandoffContext = {
      sessionId:     session.sessionId,
      callSid:       session.callSid ?? '',
      contactId:     session.contactId ?? undefined,
      summaryToDate: summary,
      intent:        reason,
      keyFacts:      session.keyFacts,
      transcript:    session.transcript ?? [],
    };

    const result = await executeHandoff(target, context);
    span.end({ output: { target, success: result.success } });
    return result;
  } catch (err) {
    span.error(err as Error);
    return { success: false, target, message: (err as Error).message };
  }
}

// _session kept for future context-aware routing
function resolveTarget(reason: string, _session: VoiceSessionJSON): HandoffTarget {
  if (reason === 'user_requested_human') {
    return {
      type:        'human',
      phoneNumber: process.env.HUMAN_AGENT_NUMBER ?? '+34900000000',
    };
  }

  if (reason === 'qualify_success' || reason === 'high_value_lead') {
    return {
      type:    'sdr',
      agentId: process.env.SDR_AGENT_ID ?? 'sdr_default',
    };
  }

  if (reason === 'support_escalation') {
    return {
      type:    'support',
      agentId: process.env.SUPPORT_AGENT_ID ?? 'support_default',
    };
  }

  return {
    type:        'human',
    phoneNumber: process.env.HUMAN_AGENT_NUMBER ?? '+34900000000',
  };
}

async function executeHandoff(
  target: HandoffTarget,
  context: HandoffContext
): Promise<HandoffResult> {
  if (target.type === 'human') {
    const transferUrl = process.env.TWILIO_TRANSFER_TWIML_URL;
    if (!transferUrl) {
      console.warn('[handoff] TWILIO_TRANSFER_TWIML_URL not set — human handoff skipped');
      return { success: false, target, message: 'TWILIO_TRANSFER_TWIML_URL not configured' };
    }
    console.log(`[handoff] Transferring to human: ${target.phoneNumber}`);
    console.log(`[handoff] Context: ${context.summaryToDate}`);
    return { success: true, target };
  }

  if (target.type === 'sdr' || target.type === 'support' || target.type === 'closing') {
    AgentContextRegistry.set(target.agentId, context);
    console.log(`[handoff] Context stored for agent ${target.agentId}`);
    return { success: true, target };
  }

  return { success: false, target, message: 'Unknown target type' };
}

export const AgentContextRegistry = {
  _store: new Map<string, { context: HandoffContext; expiresAt: number }>(),

  set(agentId: string, context: HandoffContext) {
    this._store.set(agentId, {
      context,
      expiresAt: Date.now() + 30 * 60 * 1000,
    });
  },

  get(agentId: string): HandoffContext | null {
    const entry = this._store.get(agentId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(agentId);
      return null;
    }
    return entry.context;
  },

  clear(agentId: string) {
    this._store.delete(agentId);
  },
};