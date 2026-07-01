/**
 * toolHandler.ts — OpenAI Realtime tool call dispatcher
 *
 * Handles all function_call_arguments.done events from OpenAI.
 * Each tool name maps to a handler that runs non-blocking.
 * Always responds to OpenAI immediately to unblock the audio thread.
 *
 * Tools registered here must match the session config in src/llm/openai.ts:
 *  - log_to_crm
 *  - check_availability
 *  - transfer_call
 */

import type WebSocket from 'ws';
import type { SessionStore } from '../runtime/session.js';
import { syncCallToHubSpot }   from '../integrations/hubspot.js';
import { syncCallToSalesforce } from '../integrations/salesforce.js';
import { routeHandoff }         from './handoff.js';
import { logger } from '../analytics/logger.js';

interface ToolCallMessage {
  call_id:   string;
  name:      string;
  arguments: string;
}

interface LogToCRMArgs {
  contact_name?: string;
  intent:        string;
  summary:       string;
  outcome:       string;
  contact_id?:   string;
}

interface TransferCallArgs {
  reason:  string;
  summary: string;
}

export function handleToolCall(
  msg: ToolCallMessage,
  openAiWs: WebSocket,
  session: SessionStore
): void {
  const { call_id, name, arguments: rawArgs } = msg;
  logger.info({ tool: name, rawArgs }, '[tool] Invoked');

  // Always ACK immediately — never block the audio thread
  const ack = (output: Record<string, unknown> = { success: true }) => {
    openAiWs.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type:    'function_call_output',
        call_id,
        output:  JSON.stringify(output),
      },
    }));
    openAiWs.send(JSON.stringify({ type: 'response.create' }));
  };

  // ── log_to_crm ────────────────────────────────────────────────────────────
  if (name === 'log_to_crm') {
    let args: LogToCRMArgs = { intent: 'other', summary: '', outcome: 'callback' };
    try { args = JSON.parse(rawArgs) as LogToCRMArgs; } catch { /* ignore */ }

    const endedAt    = new Date().toISOString();
    const durationMs = new Date(endedAt).getTime() - new Date(session.startedAt).getTime();
    const fromNumber = process.env.TWILIO_PHONE_NUMBER ?? '';

    if (args.contact_id) session.setContactId(args.contact_id);

    if (process.env.HUBSPOT_ACCESS_TOKEN) {
      syncCallToHubSpot({
        payload: {
          callSid:     session.callSid ?? 'unknown',
          fromNumber,
          toNumber:    '',
          durationMs,
          summary:     args.summary,
          intent:      args.intent,
          outcome:     args.outcome,
          contactName: args.contact_name,
        },
        utterances: session.transcript,
        contactId:  args.contact_id,
      })
        .then(({ callId }) => {
          session.crm.hubspot = { callId, synced: true };
          logger.info({ callId }, '[crm] HubSpot synced');
        })
        .catch((err: Error) => {
          logger.error({ err }, '[crm] HubSpot sync failed');
          session.crm.hubspot = { callId: '', synced: false };
        });
    }

    if (process.env.SALESFORCE_INSTANCE_URL && process.env.SALESFORCE_ACCESS_TOKEN) {
      syncCallToSalesforce({
        payload: {
          callSid:         session.callSid ?? 'unknown',
          fromNumber,
          toNumber:        '',
          startTime:       session.startedAt,
          endTime:         endedAt,
          durationSeconds: Math.round(durationMs / 1000),
          summary:         args.summary,
          intent:          args.intent,
          outcome:         args.outcome,
          contactName:     args.contact_name,
        },
        utterances: session.transcript,
        contactId:  args.contact_id,
      })
        .then(({ voiceCallId }) => {
          session.crm.salesforce = { voiceCallId, synced: true };
          logger.info({ voiceCallId }, '[crm] Salesforce synced');
        })
        .catch((err: Error) => {
          logger.error({ err }, '[crm] Salesforce sync failed');
          session.crm.salesforce = { voiceCallId: '', synced: false };
        });
    }

    ack({ success: true });
    return;
  }

  // ── transfer_call ─────────────────────────────────────────────────────────
  if (name === 'transfer_call') {
    let args: TransferCallArgs = { reason: 'user_requested_human', summary: '' };
    try { args = JSON.parse(rawArgs) as TransferCallArgs; } catch { /* ignore */ }

    // ACK immediately, then route handoff async
    ack({ success: true, message: 'Transferring now.' });

    routeHandoff(args.reason, args.summary, session.toJSON())
      .then((result) => {
        logger.info({ success: result.success, target: result.target.type }, '[handoff] Result');
      })
      .catch((err: Error) => {
        logger.error({ err }, '[handoff] Failed');
      });

    return;
  }

  // ── unknown tool ──────────────────────────────────────────────────────────
  logger.warn({ tool: name }, '[tool] Unknown tool');
  ack({ success: false, error: `Unknown tool: ${name}` });
}
