import type WebSocket from 'ws';
import type { SessionStore } from '../runtime/session.js';

interface ToolCallMessage {
  call_id: string;
  name: string;
  arguments: string;
}

export function handleToolCall(
  msg: ToolCallMessage,
  openAiWs: WebSocket,
  session: SessionStore
): void {
  const { call_id, name, arguments: rawArgs } = msg;
  let args: Record<string, unknown> = {};

  try { args = JSON.parse(rawArgs); } catch { /* ignore */ }

  console.log(`[tool] ${name}`, args);

  if (name === 'log_to_crm') {
    // TODO: replace stub with real HubSpot / Salesforce POST
    console.log(`[crm:stub] Would log: ${JSON.stringify(args)}`);

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
