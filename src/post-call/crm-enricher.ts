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

export async function flushSessionToCRM(session: VoiceSessionJSON): Promise<void> {
  if (!session.transcript || session.transcript.length < 2) {
    console.warn(`[crm-enricher] Skipping short session ${session.sessionId}`);
    return;
  }

  console.log(`[crm-enricher] Starting post-call analysis for ${session.sessionId}`);

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
    console.log(`[crm-enricher] Analysis done: intent=${analysis.intent} sentiment=${analysis.sentiment}`);
  } catch (err) {
    console.error('[crm-enricher] Analysis failed, syncing raw session:', (err as Error).message);
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
        .then(({ callId }) => console.log(`[crm-enricher] HubSpot synced: callId=${callId}`))
        .catch((err: Error) => console.error('[crm-enricher] HubSpot sync failed:', err.message))
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
        .then(({ voiceCallId }) => console.log(`[crm-enricher] Salesforce synced: voiceCallId=${voiceCallId}`))
        .catch((err: Error) => console.error('[crm-enricher] Salesforce sync failed:', err.message))
    );
  }

  if (tasks.length === 0) {
    console.warn('[crm-enricher] No CRM configured — session logged locally only');
  }

  await Promise.allSettled(tasks);
  console.log(`[crm-enricher] Done for session ${session.sessionId}`);
}
