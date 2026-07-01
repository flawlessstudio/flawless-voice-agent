/**
 * HubSpot CRM Integration
 * Docs: https://developers.hubspot.com/docs/api/crm/extensions/recordings-and-transcriptions
 * Auth: Private App token (HUBSPOT_ACCESS_TOKEN)
 */

import { logger } from '../analytics/logger.js';

const BASE = 'https://api.hubapi.com';

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
  };
}

async function post(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function put(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: headers(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot PUT ${path} → ${res.status}: ${text}`);
  }
}

async function patch(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot PATCH ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CallPayload {
  callSid: string;
  fromNumber: string;
  toNumber: string;
  durationMs: number;
  summary: string;
  intent: string;
  outcome: string;
  contactName?: string;
}

export interface Utterance {
  speaker: 'agent' | 'user';
  text: string;
  ts: number;
}

// ── 0. Upsert contact by phone (fast-path CRM sync) ────────────────────────────

export interface UpsertContactParams {
  phone: string;
  lastCallDate: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Upserts a HubSpot contact keyed by phone number.
 * Uses the CRM v3 "search or create" idiom: search by phone, PATCH if found,
 * otherwise POST a new contact.
 */
export async function upsertContact(params: UpsertContactParams): Promise<string> {
  const searchRes = await post('/crm/v3/objects/contacts/search', {
    filterGroups: [{ filters: [{ propertyName: 'phone', operator: 'EQ', value: params.phone }] }],
    limit: 1,
  }) as { results: { id: string }[] };

  const properties = {
    phone: params.phone,
    hs_lead_status: 'CONNECTED',
    ...(params.firstName ? { firstname: params.firstName } : {}),
    ...(params.lastName ? { lastname: params.lastName } : {}),
  };

  if (searchRes.results?.length) {
    const contactId = searchRes.results[0].id;
    await patch(`/crm/v3/objects/contacts/${contactId}`, { properties });
    logger.info({ contactId }, '[hubspot] Contact updated');
    return contactId;
  }

  const created = await post('/crm/v3/objects/contacts', { properties }) as { id: string };
  logger.info({ contactId: created.id }, '[hubspot] Contact created');
  return created.id;
}

/**
 * Logs a lightweight call engagement (used by the fast-path agent right after
 * a turn completes, independent of the full syncCallToHubSpot post-call flow).
 */
export async function logCall(params: { sessionId: string; callSid: string | null }): Promise<string> {
  const data = await post('/crm/v3/objects/calls', {
    properties: {
      hs_call_title: `Fast-path turn — session ${params.sessionId}`,
      hs_call_status: 'COMPLETED',
      hs_call_external_id: params.callSid ?? params.sessionId,
      hs_call_direction: 'OUTBOUND',
      hs_call_source: 'INTEGRATIONS_PLATFORM',
    },
  }) as { id: string };

  logger.info({ callId: data.id }, '[hubspot] Fast-path call logged');
  return data.id;
}

// ── 1. Create HubSpot call engagement ─────────────────────────────────────────

export async function createHubSpotCall(payload: CallPayload): Promise<string> {
  const data = await post('/crm/v3/objects/calls', {
    properties: {
      hs_call_title: `Llamada outbound — ${payload.contactName ?? 'Contacto'}`,
      hs_call_body: payload.summary,
      hs_call_status: 'COMPLETED',
      hs_call_duration: String(payload.durationMs),
      hs_call_from_number: payload.fromNumber,
      hs_call_to_number: payload.toNumber,
      hs_call_direction: 'OUTBOUND',
      hs_call_external_id: payload.callSid,
      hs_call_source: 'INTEGRATIONS_PLATFORM',
    },
  }) as { id: string };

  logger.info({ callId: data.id }, '[hubspot] Call created');
  return data.id;
}

// ── 2. Associate call to contact (if contactId known) ─────────────────────────

export async function associateCallToContact(
  callId: string,
  contactId: string
): Promise<void> {
  await put(
    `/crm/v3/objects/calls/${callId}/associations/contact/${contactId}/call_to_contact`
  );
  logger.info({ callId, contactId }, '[hubspot] Call associated to contact');
}

// ── 3. Post transcript utterances ─────────────────────────────────────────────

export async function postTranscript(
  engagementId: string,
  utterances: Utterance[]
): Promise<void> {
  if (utterances.length === 0) return;

  const startTs = utterances[0]?.ts ?? Date.now();

  await post('/crm/extensions/calling/2026-03/transcripts', {
    engagementId: Number(engagementId),
    transcriptCreateUtterances: utterances.map((u) => ({
      speaker: u.speaker === 'agent' ? 'AGENT' : 'CONTACT',
      text: u.text,
      startTime: u.ts - startTs,
    })),
  });

  logger.info({ engagementId, count: utterances.length }, '[hubspot] Transcript posted');
}

// ── 4. Notify recording ready ──────────────────────────────────────────────────

export async function notifyRecordingReady(engagementId: string): Promise<void> {
  await post('/crm/v3/extensions/calling/recordings/ready', {
    engagementId: Number(engagementId),
  });
  logger.info({ engagementId }, '[hubspot] Recording ready notified');
}

// ── 5. Full sync (orchestrates all steps) ─────────────────────────────────────

export async function syncCallToHubSpot({
  payload,
  utterances,
  contactId,
}: {
  payload: CallPayload;
  utterances: Utterance[];
  contactId?: string;
}): Promise<{ callId: string }> {
  const callId = await createHubSpotCall(payload);

  if (contactId) {
    await associateCallToContact(callId, contactId).catch((err) =>
      logger.warn({ err }, '[hubspot] Association failed (non-fatal)')
    );
  }

  await postTranscript(callId, utterances).catch((err) =>
    logger.warn({ err }, '[hubspot] Transcript failed (non-fatal)')
  );

  await notifyRecordingReady(callId).catch((err) =>
    logger.warn({ err }, '[hubspot] Recording notify failed (non-fatal)')
  );

  return { callId };
}
