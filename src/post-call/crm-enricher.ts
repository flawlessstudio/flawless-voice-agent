/**
 * crm-enricher.ts — Post-call CRM sync
 *
 * Runs AFTER the call ends, asynchronously.
 * Never called from the real-time audio path.
 *
 * Flow:
 *  1. Receive completed VoiceSession
 *  2. Run post-call analysis (OpenAI) to extract intent/summary/sentiment
 *  3. Sync to HubSpot and/or Salesforce depending on env config
 *  4. Mark session as synced
 */

import type { VoiceSessionJSON } from '../runtime/session.js';
import { analyzeTranscript } from './analyzer.js';
import { syncCallToHubSpot }   from '../integrations/hubspot.js';
import { syncCallToSalesforce } from '../integrations/salesforce.js';
import { logger } from '../analytics/logger.js';

export async function flushSessionToCRM(session: VoiceSessionJSON): Promise<void> {
  if (!session.transcript || session.transcript.length < 2) {
    logger.warn({ sessionId: session.sessionId }, '[crm-enricher] Skipping short session');
    return;
  }

  logger.info({ sessionId: session.sessionId }, '[crm-enricher] Starting post-call analysis');

  // Step 1: Enrich with LLM analysis (non-blocking, post-call only)
  let enriched = { ...session };
  try {
    const analysis = await analyzeTranscript(session.transcript);
    enriched = {
      ...session,
      intent:     analysis.intent,
      summary:    analysis.summary,
      sentiment:  analysis.sentiment,
      outcome:    analysis.outcome,
      nextAction: analysis.nextAction,
      keyFacts:   analysis.keyFacts,
    };
    logger.info({ intent: analysis.intent, sentiment: analysis.sentiment }, '[crm-enricher] Analysis done');
  } catch (err) {
    logger.error({ err }, '[crm-enricher] Analysis failed, syncing raw session');
  }

  const fromNumber  = process.env.TWILIO_PHONE_NUMBER ?? '';
  const durationMs  = enriched.durationMs ?? 0;

  // Step 2: Sync to CRM(s) in parallel
  const tasks: Promise<void>[] = [];

  if (process.env.HUBSPOT_ACCESS_TOKEN) {
    tasks.push(
      syncCallToHubSpot({
        payload: {
          callSid:     enriched.callSid ?? 'unknown',
          fromNumber,
          toNumber:    '',
          durationMs,
          summary:     enriched.summary  ?? '',
          intent:      enriched.intent   ?? 'other',
          outcome:     enriched.outcome  ?? 'callback',
        },
        utterances: enriched.transcript,
        contactId:  enriched.contactId,
      })
        .then(({ callId }) => logger.info({ callId }, '[crm-enricher] HubSpot synced'))
        .catch((err: Error) => logger.error({ err }, '[crm-enricher] HubSpot sync failed'))
    );
  }

  if (process.env.SALESFORCE_INSTANCE_URL && process.env.SALESFORCE_ACCESS_TOKEN) {
    tasks.push(
      syncCallToSalesforce({
        payload: {
          callSid:         enriched.callSid ?? 'unknown',
          fromNumber,
          toNumber:        '',
          startTime:       enriched.startedAt,
          endTime:         enriched.endedAt ?? new Date().toISOString(),
          durationSeconds: Math.round(durationMs / 1000),
          summary:         enriched.summary  ?? '',
          intent:          enriched.intent   ?? 'other',
          outcome:         enriched.outcome  ?? 'callback',
        },
        utterances: enriched.transcript,
        contactId:  enriched.contactId,
      })
        .then(({ voiceCallId }) => logger.info({ voiceCallId }, '[crm-enricher] Salesforce synced'))
        .catch((err: Error) => logger.error({ err }, '[crm-enricher] Salesforce sync failed'))
    );
  }

  if (tasks.length === 0) {
    logger.warn('[crm-enricher] No CRM configured — session logged locally only');
  }

  await Promise.allSettled(tasks);
  logger.info({ sessionId: session.sessionId }, '[crm-enricher] Done for session');
}
