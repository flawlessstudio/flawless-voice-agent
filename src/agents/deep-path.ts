import OpenAI from 'openai';
import { CallSession, SessionStore } from '../runtime/call-session.js';
import { checkConsent, captureConsent } from '../compliance/consent.js';
import { recordFailure, recordSuccess } from '../runtime/circuit-breaker.js';
import { upsertLead, logActivity } from '../integrations/salesforce.js';
import { triggerFallback } from '../runtime/fallback.js';
import { logger } from '../analytics/logger.js';
import { SYSTEM_PROMPT } from '../prompts/system.js';
import { redactPII } from '../compliance/pii.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'qualify_lead',
      description: 'Mark a lead as qualified and save qualification data to CRM',
      parameters: {
        type: 'object',
        properties: {
          budget_confirmed: { type: 'boolean' },
          authority_confirmed: { type: 'boolean' },
          need_confirmed: { type: 'boolean' },
          timeline_days: { type: 'number' },
          notes: { type: 'string' },
        },
        required: ['budget_confirmed', 'authority_confirmed', 'need_confirmed'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_followup',
      description: 'Schedule a follow-up call or meeting',
      parameters: {
        type: 'object',
        properties: {
          preferred_day: { type: 'string' },
          preferred_time: { type: 'string' },
          contact_name: { type: 'string' },
        },
        required: ['preferred_day'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'request_human_handoff',
      description: 'Request transfer to a human agent',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['reason'],
      },
    },
  },
];

async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
  session: CallSession
): Promise<string> {
  switch (toolName) {
    case 'qualify_lead':
      await upsertLead({
        callSid: session.callSid,
        qualified: 'true',
        ...Object.fromEntries(Object.entries(args).map(([k, v]) => [k, String(v)])),
      });
      await logActivity({ sessionId: session.sessionId, type: 'qualification', data: args });
      SessionStore.update(session.callSid, { crmSynced: true });
      return 'Lead qualified and saved to CRM.';

    case 'schedule_followup':
      logger.info({ session: session.sessionId, args }, 'Follow-up scheduled');
      return `Follow-up scheduled for ${args.preferred_day}.`;

    case 'request_human_handoff':
      SessionStore.update(session.callSid, { status: 'handed-off' });
      return 'Handoff requested.';

    default:
      return 'Unknown tool.';
  }
}

export const DeepPath = {
  async handle(session: CallSession, body: Record<string, string>): Promise<string> {
    logger.info({ sessionId: session.sessionId }, 'Deep path start');

    const from = body.From || '';
    const hasConsent = await checkConsent(from);
    if (!hasConsent) {
      logger.warn({ from }, 'Consent check failed on deep path');
      return `<Response><Say>I'm unable to proceed. Goodbye.</Say><Hangup/></Response>`;
    }
    await captureConsent(session.sessionId, from);
    SessionStore.update(session.callSid, { consentCaptured: true, path: 'deep' });

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Incoming call from ${from}. Start the conversation.` },
    ];

    let response: OpenAI.Chat.ChatCompletion;
    let agentText = '';
    let handoffRequested = false;
    let turns = 0;
    const MAX_TURNS = 15;

    try {
      while (turns < MAX_TURNS) {
        response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages,
          tools: TOOLS,
          tool_choice: 'auto',
        });

        const choice = response.choices[0];
        recordSuccess('deep-path');

        if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
          messages.push(choice.message);
          for (const tc of choice.message.tool_calls) {
            const args = JSON.parse(tc.function.arguments || '{}');
            const result = await handleToolCall(tc.function.name, args, session);
            messages.push({ role: 'tool', tool_call_id: tc.id, content: result });
            if (tc.function.name === 'request_human_handoff') handoffRequested = true;
          }
        } else {
          agentText = choice.message.content || '';
          break;
        }
        turns++;
      }

      SessionStore.update(session.callSid, { turns, status: handoffRequested ? 'handed-off' : 'completed' });

      if (handoffRequested) {
        return triggerFallback(session, 'human-handoff-requested');
      }

      const safeText = redactPII(agentText);
      return `<Response><Say voice="Polly.Joanna">${safeText}</Say><Hangup/></Response>`;

    } catch (err) {
      recordFailure('deep-path');
      logger.error({ err, sessionId: session.sessionId }, 'Deep path error');
      return triggerFallback(session, 'deep-path-error');
    }
  },
};
