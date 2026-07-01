/**
 * Salesforce Service Cloud Voice Integration
 * Docs: https://developer.salesforce.com/docs/atlas.en-us.voice_pt_developer_guide.meta/voice_pt_developer_guide
 * Auth: OAuth2 Connected App (access_token + refresh_token)
 */

import { logger } from '../analytics/logger.js';

export interface SalesforceConfig {
  instanceUrl: string;   // e.g. https://yourorg.my.salesforce.com
  accessToken: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}

export interface VoiceCallPayload {
  callSid: string;
  fromNumber: string;
  toNumber: string;
  startTime: string;     // ISO8601
  endTime: string;       // ISO8601
  durationSeconds: number;
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

function cfg(): SalesforceConfig {
  return {
    instanceUrl:  process.env.SALESFORCE_INSTANCE_URL ?? '',
    accessToken:  process.env.SALESFORCE_ACCESS_TOKEN ?? '',
    refreshToken: process.env.SALESFORCE_REFRESH_TOKEN ?? '',
    clientId:     process.env.SALESFORCE_CLIENT_ID ?? '',
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET ?? '',
  };
}

// ── OAuth2 token refresh ─────────────────────────────────────────────────────

async function refreshAccessToken(): Promise<string> {
  const { refreshToken, clientId, clientSecret } = cfg();
  const res = await fetch('https://login.salesforce.com/services/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`SF token refresh failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  process.env.SALESFORCE_ACCESS_TOKEN = data.access_token;
  logger.info('[salesforce] Access token refreshed');
  return data.access_token;
}

async function sfFetch(
  path: string,
  method: string,
  body?: unknown,
  retry = true
): Promise<unknown> {
  const { instanceUrl, accessToken } = cfg();
  const res = await fetch(`${instanceUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Auto-refresh on 401
  if (res.status === 401 && retry) {
    await refreshAccessToken();
    return sfFetch(path, method, body, false);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SF ${method} ${path} → ${res.status}: ${text}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── 0. Upsert Lead + log ad-hoc activity (deep-path tool calls) ─────────────

export interface UpsertLeadParams {
  callSid: string | null;
  qualified: string;
  [key: string]: string | null;
}

/**
 * Upserts a Salesforce Lead using the call's ExternalId as the idempotency
 * key (PATCH-by-external-id, "upsert" semantics per Salesforce REST API).
 */
export async function upsertLead(params: UpsertLeadParams): Promise<string> {
  const externalId = params.callSid ?? `session-${Date.now()}`;
  const { callSid: _callSid, ...fields } = params;
  void _callSid;

  const data = await sfFetch(
    `/services/data/v60.0/sobjects/Lead/ExternalId__c/${encodeURIComponent(externalId)}`,
    'PATCH',
    {
      Status: fields.qualified === 'true' ? 'Qualified' : 'Working',
      Description: JSON.stringify(fields),
    }
  ) as { id?: string } | null;

  const leadId = data?.id ?? externalId;
  logger.info({ leadId }, '[salesforce] Lead upserted');
  return leadId;
}

/**
 * Logs a generic post-tool-call activity (Task) against the call, used by
 * the deep-path agent to keep an audit trail of every tool invocation.
 */
export async function logActivity(params: {
  sessionId: string;
  type: string;
  data: Record<string, unknown>;
}): Promise<string> {
  const data = await sfFetch(
    '/services/data/v60.0/sobjects/Task',
    'POST',
    {
      Subject: `[${params.type}] session ${params.sessionId}`,
      Status: 'Completed',
      Description: JSON.stringify(params.data),
    }
  ) as { id: string };

  logger.info({ activityId: data.id }, '[salesforce] Activity logged');
  return data.id;
}

// ── 1. Create VoiceCall record ───────────────────────────────────────────────

export async function createVoiceCallRecord(
  p: VoiceCallPayload
): Promise<string> {
  const data = await sfFetch(
    '/services/data/v60.0/sobjects/VoiceCall',
    'POST',
    {
      CallDurationInSeconds: p.durationSeconds,
      CallType:              'Outbound',
      StartTime:             p.startTime,
      EndTime:               p.endTime,
      FromPhoneNumber:       p.fromNumber,
      ToPhoneNumber:         p.toNumber,
      Status:                'Completed',
      Description:           p.summary,
      Subject:               `Llamada IA — ${p.contactName ?? 'Contacto'} [${p.intent}]`,
      ExternalId__c:         p.callSid,
    }
  ) as { id: string };

  logger.info({ voiceCallId: data.id }, '[salesforce] VoiceCall created');
  return data.id;
}

// ── 2. Post transcript as ContentNote ───────────────────────────────────────

export async function postTranscriptNote(
  voiceCallId: string,
  utterances: Utterance[]
): Promise<void> {
  if (utterances.length === 0) return;

  const body = utterances
    .map((u) => `[${u.speaker.toUpperCase()}] ${u.text}`)
    .join('\n');

  // Create ContentNote
  const note = await sfFetch(
    '/services/data/v60.0/sobjects/ContentNote',
    'POST',
    {
      Title:   'Transcripción de llamada IA',
      Content: Buffer.from(body).toString('base64'),
    }
  ) as { id: string };

  // Link to VoiceCall via ContentDocumentLink
  await sfFetch(
    '/services/data/v60.0/sobjects/ContentDocumentLink',
    'POST',
    {
      ContentDocumentId: note.id,
      LinkedEntityId:    voiceCallId,
      ShareType:         'V',
    }
  );

  logger.info({ voiceCallId }, '[salesforce] Transcript note linked to VoiceCall');
}

// ── 3. Associate to Contact (optional) ──────────────────────────────────────

export async function associateToContact(
  voiceCallId: string,
  contactId: string
): Promise<void> {
  await sfFetch(
    '/services/data/v60.0/sobjects/TaskRelation',
    'POST',
    {
      TaskId:    voiceCallId,
      RelationId: contactId,
    }
  );
  logger.info({ voiceCallId, contactId }, '[salesforce] VoiceCall associated to contact');
}

// ── 4. Full sync ─────────────────────────────────────────────────────────────

export async function syncCallToSalesforce({
  payload,
  utterances,
  contactId,
}: {
  payload: VoiceCallPayload;
  utterances: Utterance[];
  contactId?: string;
}): Promise<{ voiceCallId: string }> {
  const voiceCallId = await createVoiceCallRecord(payload);

  await postTranscriptNote(voiceCallId, utterances).catch((err: Error) =>
    logger.warn({ err }, '[salesforce] Transcript failed (non-fatal)')
  );

  if (contactId) {
    await associateToContact(voiceCallId, contactId).catch((err: Error) =>
      logger.warn({ err }, '[salesforce] Association failed (non-fatal)')
    );
  }

  return { voiceCallId };
}
