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
import { logger } from '../analytics/logger.js';

export async function webhookRoutes(app: FastifyInstance) {

  // ── Vapi webhook ───────────────────────────────────────────────────────────
  app.post('/webhooks/vapi', async (req, reply) => {
    const event = req.body as VapiWebhookEvent;

    const result = routeVapiEvent(event, {
      onCallStarted: (callId) => {
        logger.info({ callId }, '[webhook:vapi] started');
      },

      onCallEnded: (callId, reason) => {
        logger.info({ callId, reason }, '[webhook:vapi] ended');
      },

      onTranscript: (callId, text) => {
        logger.info({ callId, text: text.slice(0, 80) }, '[webhook:vapi] transcript');
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
            .then(({ callId: hsId }) => logger.info({ hsId }, '[webhook:vapi] HubSpot synced'))
            .catch((e: Error) => logger.error({ err: e }, '[webhook:vapi] HubSpot error'));
        }

        if (process.env.SALESFORCE_INSTANCE_URL) {
          const now = new Date().toISOString();
          syncCallToSalesforce({
            payload: { ...payload, startTime: now, endTime: now, durationSeconds: 0 },
            utterances: [],
          })
            .then(({ voiceCallId }) => logger.info({ voiceCallId }, '[webhook:vapi] SF synced'))
            .catch((e: Error) => logger.error({ err: e }, '[webhook:vapi] SF error'));
        }
      },

      onFunctionCall: async (_callId, name, params) => {
        logger.info({ name, params }, '[webhook:vapi] function-call');
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
      logger.warn('[webhook:retell] Invalid signature');
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    const event = req.body as RetellWebhookEvent;

    routeRetellEvent(event, {
      onCallStarted: (callId) => {
        logger.info({ callId }, '[webhook:retell] started');
      },

      onCallEnded: (callId, durationMs) => {
        logger.info({ callId, durationMs }, '[webhook:retell] ended');
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
            .then(({ callId: hsId }) => logger.info({ hsId }, '[webhook:retell] HubSpot synced'))
            .catch((e: Error) => logger.error({ err: e }, '[webhook:retell] HubSpot error'));
        }

        if (process.env.SALESFORCE_INSTANCE_URL) {
          const now = new Date().toISOString();
          syncCallToSalesforce({
            payload: { ...payload, startTime: now, endTime: now, durationSeconds: Math.round((call.duration_ms ?? 0) / 1000) },
            utterances: [],
          })
            .then(({ voiceCallId }) => logger.info({ voiceCallId }, '[webhook:retell] SF synced'))
            .catch((e: Error) => logger.error({ err: e }, '[webhook:retell] SF error'));
        }
      },
    });

    // Retell requires 2xx within 10s
    return reply.send({ received: true });
  });
}
