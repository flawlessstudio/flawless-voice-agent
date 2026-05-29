/**
 * Webhook routes for Vapi and Retell
 * POST /webhooks/vapi   — Vapi events
 * POST /webhooks/retell — Retell events (signature verified)
 */

import type { FastifyInstance } from 'fastify';
import { routeVapiEvent, type VapiWebhookEvent } from '../orchestration/vapi.js';
import { routeRetellEvent, verifyRetellSignature, type RetellWebhookEvent } from '../orchestration/retell.js';
import { syncCallToHubSpot } from '../integrations/hubspot.js';
import { syncCallToSalesforce } from '../integrations/salesforce.js';

export async function webhookRoutes(app: FastifyInstance) {

  // ── Vapi webhook ───────────────────────────────────────────────────────────
  app.post('/webhooks/vapi', async (req, reply) => {
    const event = req.body as VapiWebhookEvent;

    const result = routeVapiEvent(event, {
      onCallStarted: (callId) => {
        console.log(`[webhook:vapi] started ${callId}`);
      },

      onCallEnded: (callId, reason) => {
        console.log(`[webhook:vapi] ended ${callId} reason=${reason}`);
      },

      onTranscript: (callId, text) => {
        console.log(`[webhook:vapi] transcript ${callId}: ${text.slice(0, 80)}`);
      },

      onEndOfCallReport: (callId, artifact) => {
        if (!artifact) return;
        const summary = artifact.summary ?? artifact.transcript?.slice(0, 200) ?? '';

        // CRM sync from Vapi end-of-call report
        const payload = {
          callSid:     callId,
          fromNumber:  process.env.TWILIO_PHONE_NUMBER ?? '',
          toNumber:    '',
          durationMs:  0,
          summary,
          intent:      'other',
          outcome:     'callback',
        };

        if (process.env.HUBSPOT_ACCESS_TOKEN) {
          syncCallToHubSpot({ payload, utterances: [] })
            .then(({ callId: hsId }) => console.log(`[webhook:vapi] HubSpot synced ${hsId}`))
            .catch((e: Error) => console.error(`[webhook:vapi] HubSpot error: ${e.message}`));
        }

        if (process.env.SALESFORCE_INSTANCE_URL) {
          const now = new Date().toISOString();
          syncCallToSalesforce({
            payload: { ...payload, startTime: now, endTime: now, durationSeconds: 0 },
            utterances: [],
          })
            .then(({ voiceCallId }) => console.log(`[webhook:vapi] SF synced ${voiceCallId}`))
            .catch((e: Error) => console.error(`[webhook:vapi] SF error: ${e.message}`));
        }
      },

      onFunctionCall: async (_callId, name, params) => {
        console.log(`[webhook:vapi] function-call ${name}`, params);
        return { success: true };
      },
    });

    // For function-call events Vapi expects the result in the response body
    if (result) return reply.send(result);
    return reply.send({ received: true });
  });

  // ── Retell webhook ─────────────────────────────────────────────────────────
  app.post('/webhooks/retell', async (req, reply) => {
    // Verify HMAC-SHA256 signature
    const sig = req.headers['x-retell-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    if (sig && !verifyRetellSignature(rawBody, sig)) {
      console.warn('[webhook:retell] Invalid signature');
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    const event = req.body as RetellWebhookEvent;

    routeRetellEvent(event, {
      onCallStarted: (callId) => {
        console.log(`[webhook:retell] started ${callId}`);
      },

      onCallEnded: (callId, durationMs) => {
        console.log(`[webhook:retell] ended ${callId} duration=${durationMs}ms`);
      },

      onCallAnalyzed: (callId, call) => {
        if (!call) return;
        const summary  = call.call_analysis?.call_summary ?? '';
        const payload = {
          callSid:     callId,
          fromNumber:  call.from_number,
          toNumber:    call.to_number,
          durationMs:  call.duration_ms ?? 0,
          summary,
          intent:      'other',
          outcome:     call.call_analysis?.call_successful ? 'success' : 'callback',
        };

        if (process.env.HUBSPOT_ACCESS_TOKEN) {
          syncCallToHubSpot({ payload, utterances: [] })
            .then(({ callId: hsId }) => console.log(`[webhook:retell] HubSpot synced ${hsId}`))
            .catch((e: Error) => console.error(`[webhook:retell] HubSpot error: ${e.message}`));
        }

        if (process.env.SALESFORCE_INSTANCE_URL) {
          const now = new Date().toISOString();
          syncCallToSalesforce({
            payload: { ...payload, startTime: now, endTime: now, durationSeconds: Math.round((call.duration_ms ?? 0) / 1000) },
            utterances: [],
          })
            .then(({ voiceCallId }) => console.log(`[webhook:retell] SF synced ${voiceCallId}`))
            .catch((e: Error) => console.error(`[webhook:retell] SF error: ${e.message}`));
        }
      },
    });

    // Retell requires 2xx within 10s
    return reply.send({ received: true });
  });
}
