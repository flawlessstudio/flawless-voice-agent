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
import { syncToHubspot } from '../integrations/hubspot.js';
import { syncToSalesforce } from '../integrations/salesforce.js';

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
      intent:    analysis.intent,
      summary:   analysis.summary,
      sentiment: analysis.sentiment,
      outcome:   analysis.outcome,
    };
    console.log(`[crm-enricher] Analysis done: intent=${analysis.intent} sentiment=${analysis.sentiment}`);
  } catch (err) {
    console.error('[crm-enricher] Analysis failed, syncing raw session:', (err as Error).message);
  }

  // Step 2: Sync to CRM(s) in parallel
  const tasks: Promise<void>[] = [];

  if (process.env.HUBSPOT_ACCESS_TOKEN) {
    tasks.push(
      syncToHubspot(enriched).catch((err: Error) =>
        console.error('[crm-enricher] HubSpot sync failed:', err.message)
      )
    );
  }

  if (process.env.SALESFORCE_INSTANCE_URL && process.env.SALESFORCE_ACCESS_TOKEN) {
    tasks.push(
      syncToSalesforce(enriched).catch((err: Error) =>
        console.error('[crm-enricher] Salesforce sync failed:', err.message)
      )
    );
  }

  if (tasks.length === 0) {
    console.warn('[crm-enricher] No CRM configured — session logged locally only');
  }

  await Promise.allSettled(tasks);
  console.log(`[crm-enricher] Done for session ${session.sessionId}`);
}
