import type WebSocket from 'ws';
import type { SessionStore } from '../runtime/session.js';
import { syncCallToHubSpot } from '../integrations/hubspot.js';
import { syncCallToSalesforce } from '../integrations/salesforce.js';

interface ToolCallMessage {
  call_id: string;
  name: string;
  arguments: string;
}

interface LogToCRMArgs {
  contact_name?: string;
  intent: string;
  summary: string;
  outcome: string;
  contact_id?: string;
}

export function handleToolCall(
  msg: ToolCallMessage,
  openAiWs: WebSocket,
  session: SessionStore
): void {
  const { call_id, name, arguments: rawArgs } = msg;
  let args: LogToCRMArgs = { intent: 'other', summary: '', outcome: 'callback' };
  try { args = JSON.parse(rawArgs) as LogToCRMArgs; } catch { /* ignore */ }

  console.log(`[tool] ${name}`, args);

  if (name === 'log_to_crm') {
    const endedAt = new Date().toISOString();
    const durationMs = new Date(endedAt).getTime() - new Date(session.startedAt).getTime();
    const fromNumber = process.env.TWILIO_PHONE_NUMBER ?? '';

    // ── HubSpot sync (non-blocking) ──────────────────────────────────────────
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
          console.log(`[crm] HubSpot synced. callId=${callId}`);
        })
        .catch((err: Error) => {
          console.error(`[crm] HubSpot sync failed: ${err.message}`);
          session.crm.hubspot = { callId: '', synced: false };
        });
    }

    // ── Salesforce sync (non-blocking) ───────────────────────────────────────
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
          console.log(`[crm] Salesforce synced. voiceCallId=${voiceCallId}`);
        })
        .catch((err: Error) => {
          console.error(`[crm] Salesforce sync failed: ${err.message}`);
          session.crm.salesforce = { voiceCallId: '', synced: false };
        });
    }

    // ── Respond to OpenAI immediately (never block audio) ────────────────────
    openAiWs.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id,
        output: JSON.stringify({ success: true }),
      },
    }));
    openAiWs.send(JSON.stringify({ type: 'response.create' }));
  }
}
