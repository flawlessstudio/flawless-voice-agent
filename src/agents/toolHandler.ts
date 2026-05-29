import type WebSocket from 'ws';
import type { SessionStore } from '../runtime/session.js';
import { syncCallToHubSpot } from '../integrations/hubspot.js';

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

    // Fire and forget — non-blocking
    syncCallToHubSpot({
      payload: {
        callSid: session.callSid ?? 'unknown',
        fromNumber: process.env.TWILIO_PHONE_NUMBER ?? '',
        toNumber: '',
        durationMs,
        summary: args.summary,
        intent: args.intent,
        outcome: args.outcome,
        contactName: args.contact_name,
      },
      utterances: session.transcript,
      contactId: args.contact_id,
    })
      .then(({ callId }) => {
        session.crm.hubspot = { callId, synced: true };
        console.log(`[crm] HubSpot synced. callId=${callId}`);
      })
      .catch((err: Error) => {
        console.error(`[crm] HubSpot sync failed: ${err.message}`);
        session.crm.hubspot = { callId: '', synced: false };
      });

    // Respond to OpenAI immediately (non-blocking CRM)
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
