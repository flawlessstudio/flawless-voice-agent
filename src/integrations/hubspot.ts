/**
 * HubSpot CRM Integration
 * Docs: https://developers.hubspot.com/docs/api/crm/extensions/recordings-and-transcriptions
 * Auth: Private App token (HUBSPOT_ACCESS_TOKEN)
 */

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

  console.log(`[hubspot] Call created: ${data.id}`);
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
  console.log(`[hubspot] Call ${callId} associated to contact ${contactId}`);
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

  console.log(`[hubspot] Transcript posted: ${utterances.length} utterances`);
}

// ── 4. Notify recording ready ──────────────────────────────────────────────────

export async function notifyRecordingReady(engagementId: string): Promise<void> {
  await post('/crm/v3/extensions/calling/recordings/ready', {
    engagementId: Number(engagementId),
  });
  console.log(`[hubspot] Recording ready notified for ${engagementId}`);
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
      console.warn(`[hubspot] Association failed (non-fatal): ${err.message}`)
    );
  }

  await postTranscript(callId, utterances).catch((err) =>
    console.warn(`[hubspot] Transcript failed (non-fatal): ${err.message}`)
  );

  await notifyRecordingReady(callId).catch((err) =>
    console.warn(`[hubspot] Recording notify failed (non-fatal): ${err.message}`)
  );

  return { callId };
}
