/**
 * Salesforce Service Cloud Voice Integration
 * Docs: https://developer.salesforce.com/docs/atlas.en-us.voice_pt_developer_guide.meta/voice_pt_developer_guide
 * Auth: OAuth2 Connected App (access_token + refresh_token)
 */

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
  console.log('[salesforce] Access token refreshed');
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

  console.log(`[salesforce] VoiceCall created: ${data.id}`);
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

  console.log(`[salesforce] Transcript note linked to VoiceCall ${voiceCallId}`);
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
  console.log(`[salesforce] VoiceCall ${voiceCallId} associated to contact ${contactId}`);
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
    console.warn(`[salesforce] Transcript failed (non-fatal): ${err.message}`)
  );

  if (contactId) {
    await associateToContact(voiceCallId, contactId).catch((err: Error) =>
      console.warn(`[salesforce] Association failed (non-fatal): ${err.message}`)
    );
  }

  return { voiceCallId };
}
